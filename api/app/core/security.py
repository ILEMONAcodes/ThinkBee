import asyncio
import time
from collections.abc import Mapping
from functools import lru_cache
from typing import Annotated, Any
from uuid import UUID

import httpx
import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError, PyJWK
from pydantic import BaseModel, ConfigDict

from app.core.config import Settings, get_settings
from app.core.errors import AppError

MAX_BEARER_TOKEN_BYTES = 8192


class AuthenticatedIdentity(BaseModel):
    model_config = ConfigDict(frozen=True)

    supabase_user_id: UUID
    role: str
    session_id: UUID | None = None


class JwksUnavailableError(Exception):
    """Raised when signing keys cannot be loaded safely."""


class SupabaseJWTVerifier:
    def __init__(
        self,
        settings: Settings,
        *,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self._settings = settings
        self._http_client = http_client
        self._keys: dict[str, PyJWK] = {}
        self._cache_expires_at = 0.0
        self._cache_generation = 0
        self._cache_lock = asyncio.Lock()

    async def verify(self, token: str) -> AuthenticatedIdentity:
        if not self._settings.normalized_supabase_url:
            raise _auth_unavailable()
        if not token or len(token.encode("utf-8")) > MAX_BEARER_TOKEN_BYTES:
            raise _invalid_token()

        try:
            header = jwt.get_unverified_header(token)
        except InvalidTokenError as exc:
            raise _invalid_token() from exc

        key_id = header.get("kid")
        algorithm = header.get("alg")
        allowed_algorithms = self._settings.supabase_jwt_algorithm_list
        if (
            not isinstance(key_id, str)
            or not key_id
            or not isinstance(algorithm, str)
            or algorithm not in allowed_algorithms
        ):
            raise _invalid_token()

        try:
            signing_key = await self._get_signing_key(key_id)
        except JwksUnavailableError as exc:
            raise _auth_unavailable() from exc

        if signing_key.algorithm_name != algorithm:
            raise _invalid_token()

        try:
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=[algorithm],
                audience=self._settings.supabase_jwt_audience,
                issuer=self._settings.effective_supabase_jwt_issuer,
                leeway=self._settings.supabase_jwt_leeway_seconds,
                options={
                    "require": ["aud", "exp", "iat", "iss", "role", "sub"],
                    "verify_aud": True,
                    "verify_exp": True,
                    "verify_iat": True,
                    "verify_iss": True,
                    "verify_nbf": True,
                    "verify_signature": True,
                },
            )
        except jwt.ExpiredSignatureError as exc:
            raise AppError(
                status_code=401,
                code="auth_token_expired",
                message="Your session has expired. Sign in again.",
                headers={"WWW-Authenticate": "Bearer"},
            ) from exc
        except InvalidTokenError as exc:
            raise _invalid_token() from exc

        role = claims.get("role")
        if role != self._settings.supabase_required_role:
            raise _invalid_token()

        try:
            user_id = UUID(str(claims["sub"]))
            session_id = _optional_uuid(claims.get("session_id"))
        except (KeyError, TypeError, ValueError) as exc:
            raise _invalid_token() from exc

        return AuthenticatedIdentity(
            supabase_user_id=user_id,
            role=role,
            session_id=session_id,
        )

    async def _get_signing_key(self, key_id: str) -> PyJWK:
        keys = await self._get_keys(force_refresh=False)
        key = keys.get(key_id)
        if key is not None:
            return key

        cache_generation = self._cache_generation
        keys = await self._get_keys(
            force_refresh=True,
            expected_generation=cache_generation,
        )
        key = keys.get(key_id)
        if key is None:
            raise _invalid_token()
        return key

    async def _get_keys(
        self,
        *,
        force_refresh: bool,
        expected_generation: int | None = None,
    ) -> dict[str, PyJWK]:
        now = time.monotonic()
        if not force_refresh and self._keys and now < self._cache_expires_at:
            return self._keys

        async with self._cache_lock:
            now = time.monotonic()
            if not force_refresh and self._keys and now < self._cache_expires_at:
                return self._keys
            if (
                force_refresh
                and expected_generation is not None
                and self._keys
                and self._cache_generation != expected_generation
            ):
                return self._keys

            keys = await self._fetch_keys()
            self._keys = keys
            self._cache_generation += 1
            self._cache_expires_at = (
                time.monotonic() + self._settings.supabase_jwks_cache_ttl_seconds
            )
            return self._keys

    async def _fetch_keys(self) -> dict[str, PyJWK]:
        try:
            if self._http_client is None:
                timeout = httpx.Timeout(self._settings.supabase_jwks_timeout_seconds)
                async with httpx.AsyncClient(timeout=timeout) as client:
                    response = await client.get(self._settings.supabase_jwks_url)
            else:
                response = await self._http_client.get(self._settings.supabase_jwks_url)
            response.raise_for_status()
            payload = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise JwksUnavailableError from exc

        if not isinstance(payload, Mapping):
            raise JwksUnavailableError
        raw_keys = payload.get("keys")
        if not isinstance(raw_keys, list):
            raise JwksUnavailableError

        allowed_algorithms = self._settings.supabase_jwt_algorithm_list
        parsed_keys: dict[str, PyJWK] = {}
        for raw_key in raw_keys:
            if not isinstance(raw_key, dict):
                continue
            key_id = raw_key.get("kid")
            algorithm = raw_key.get("alg")
            key_use = raw_key.get("use")
            if (
                not isinstance(key_id, str)
                or not key_id
                or not isinstance(algorithm, str)
                or algorithm not in allowed_algorithms
                or key_use not in (None, "sig")
                or key_id in parsed_keys
            ):
                continue
            try:
                parsed_keys[key_id] = PyJWK.from_dict(raw_key, algorithm=algorithm)
            except (InvalidTokenError, ValueError, TypeError):
                continue

        if not parsed_keys:
            raise JwksUnavailableError
        return parsed_keys


supabase_bearer = HTTPBearer(
    auto_error=False,
    bearerFormat="JWT",
    description="Supabase access token",
    scheme_name="SupabaseJWT",
)


@lru_cache
def get_supabase_jwt_verifier() -> SupabaseJWTVerifier:
    return SupabaseJWTVerifier(get_settings())


async def require_authenticated_identity(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(supabase_bearer),
    ],
    verifier: Annotated[SupabaseJWTVerifier, Depends(get_supabase_jwt_verifier)],
) -> AuthenticatedIdentity:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AppError(
            status_code=401,
            code="auth_required",
            message="Sign in to continue.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return await verifier.verify(credentials.credentials)


def _optional_uuid(value: Any) -> UUID | None:
    if value is None:
        return None
    return UUID(str(value))


def _invalid_token() -> AppError:
    return AppError(
        status_code=401,
        code="auth_invalid_token",
        message="Your session is not valid. Sign in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def _auth_unavailable() -> AppError:
    return AppError(
        status_code=503,
        code="auth_verifier_unavailable",
        message="We could not verify your session. Try again shortly.",
    )
