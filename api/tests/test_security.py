from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any
from uuid import UUID, uuid4

import httpx
import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import Depends, FastAPI
from httpx import ASGITransport, AsyncClient, Request, Response

from app.core.config import Settings
from app.core.errors import AppError
from app.core.security import (
    AuthenticatedIdentity,
    SupabaseJWTVerifier,
    get_supabase_jwt_verifier,
    require_authenticated_identity,
)
from app.main import create_app

TEST_SUPABASE_URL = "https://project.supabase.co"
TEST_ISSUER = f"{TEST_SUPABASE_URL}/auth/v1"
TEST_AUDIENCE = "authenticated"


def _settings() -> Settings:
    return Settings(
        supabase_url=TEST_SUPABASE_URL,
        supabase_jwt_audience=TEST_AUDIENCE,
        supabase_jwt_issuer=TEST_ISSUER,
        supabase_jwt_algorithms="RS256",
        supabase_jwks_cache_ttl_seconds=300,
        supabase_jwt_leeway_seconds=0,
    )


def _key_pair(key_id: str) -> tuple[rsa.RSAPrivateKey, dict[str, Any]]:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    jwk = jwt.algorithms.RSAAlgorithm.to_jwk(private_key.public_key(), as_dict=True)
    jwk.update({"alg": "RS256", "kid": key_id, "use": "sig"})
    return private_key, jwk


def _token(
    private_key: rsa.RSAPrivateKey,
    key_id: str,
    *,
    subject: UUID | None = None,
    expires_delta: timedelta = timedelta(minutes=5),
    issuer: str = TEST_ISSUER,
    audience: str = TEST_AUDIENCE,
    role: str = "authenticated",
) -> str:
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "aud": audience,
            "exp": now + expires_delta,
            "iat": now,
            "iss": issuer,
            "role": role,
            "session_id": str(uuid4()),
            "sub": str(subject or uuid4()),
        },
        private_key,
        algorithm="RS256",
        headers={"kid": key_id},
    )


@asynccontextmanager
async def _verifier_with_handler(
    handler: Callable[[Request], Response],
) -> AsyncIterator[SupabaseJWTVerifier]:
    async with AsyncClient(transport=httpx.MockTransport(handler)) as client:
        yield SupabaseJWTVerifier(_settings(), http_client=client)


@pytest.mark.asyncio
async def test_verifies_valid_token_and_caches_jwks() -> None:
    private_key, public_jwk = _key_pair("key-1")
    user_id = uuid4()
    request_count = 0

    def handler(_: Request) -> Response:
        nonlocal request_count
        request_count += 1
        return Response(200, json={"keys": [public_jwk]})

    async with _verifier_with_handler(handler) as verifier:
        first = await verifier.verify(_token(private_key, "key-1", subject=user_id))
        second = await verifier.verify(_token(private_key, "key-1", subject=user_id))

    assert first.supabase_user_id == user_id
    assert first.role == "authenticated"
    assert second.supabase_user_id == user_id
    assert request_count == 1


@pytest.mark.asyncio
async def test_refreshes_jwks_once_when_signing_key_rotates() -> None:
    old_private_key, old_public_jwk = _key_pair("old-key")
    new_private_key, new_public_jwk = _key_pair("new-key")
    responses = [{"keys": [old_public_jwk]}, {"keys": [old_public_jwk, new_public_jwk]}]
    request_count = 0

    def handler(_: Request) -> Response:
        nonlocal request_count
        payload = responses[min(request_count, len(responses) - 1)]
        request_count += 1
        return Response(200, json=payload)

    async with _verifier_with_handler(handler) as verifier:
        await verifier.verify(_token(old_private_key, "old-key"))
        identity = await verifier.verify(_token(new_private_key, "new-key"))

    assert isinstance(identity.supabase_user_id, UUID)
    assert request_count == 2


@pytest.mark.asyncio
async def test_rejects_expired_token() -> None:
    private_key, public_jwk = _key_pair("key-1")

    def handler(_: Request) -> Response:
        return Response(200, json={"keys": [public_jwk]})

    async with _verifier_with_handler(handler) as verifier:
        with pytest.raises(AppError) as error:
            await verifier.verify(
                _token(private_key, "key-1", expires_delta=timedelta(seconds=-1))
            )

    assert error.value.status_code == 401
    assert error.value.code == "auth_token_expired"
    assert error.value.headers == {"WWW-Authenticate": "Bearer"}


@pytest.mark.asyncio
async def test_rejects_token_with_invalid_signature() -> None:
    _, trusted_public_jwk = _key_pair("key-1")
    untrusted_private_key, _ = _key_pair("key-1")

    def handler(_: Request) -> Response:
        return Response(200, json={"keys": [trusted_public_jwk]})

    async with _verifier_with_handler(handler) as verifier:
        with pytest.raises(AppError) as error:
            await verifier.verify(_token(untrusted_private_key, "key-1"))

    assert error.value.status_code == 401
    assert error.value.code == "auth_invalid_token"


@pytest.mark.asyncio
async def test_returns_temporary_error_when_jwks_is_unavailable() -> None:
    private_key, _ = _key_pair("key-1")

    def handler(_: Request) -> Response:
        return Response(503)

    async with _verifier_with_handler(handler) as verifier:
        with pytest.raises(AppError) as error:
            await verifier.verify(_token(private_key, "key-1"))

    assert error.value.status_code == 503
    assert error.value.code == "auth_verifier_unavailable"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("claim", "value"),
    [("issuer", "https://wrong.example/auth/v1"), ("audience", "wrong"), ("role", "service_role")],
)
async def test_rejects_invalid_required_claims(claim: str, value: str) -> None:
    private_key, public_jwk = _key_pair("key-1")
    if claim == "issuer":
        token = _token(private_key, "key-1", issuer=value)
    elif claim == "audience":
        token = _token(private_key, "key-1", audience=value)
    else:
        token = _token(private_key, "key-1", role=value)

    def handler(_: Request) -> Response:
        return Response(200, json={"keys": [public_jwk]})

    async with _verifier_with_handler(handler) as verifier:
        with pytest.raises(AppError) as error:
            await verifier.verify(token)

    assert error.value.status_code == 401
    assert error.value.code == "auth_invalid_token"


@pytest.mark.asyncio
async def test_protected_route_requires_bearer_token() -> None:
    application = _protected_test_app()

    async with AsyncClient(
        transport=ASGITransport(app=application), base_url="http://test"
    ) as client:
        response = await client.get("/protected")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.json() == {
        "error": {
            "code": "auth_required",
            "message": "Sign in to continue.",
            "fields": {},
        }
    }


@pytest.mark.asyncio
async def test_protected_route_returns_verified_identity() -> None:
    private_key, public_jwk = _key_pair("key-1")
    user_id = uuid4()

    def handler(_: Request) -> Response:
        return Response(200, json={"keys": [public_jwk]})

    async with _verifier_with_handler(handler) as verifier:
        application = _protected_test_app(verifier)
        token = _token(private_key, "key-1", subject=user_id)
        async with AsyncClient(
            transport=ASGITransport(app=application), base_url="http://test"
        ) as client:
            response = await client.get(
                "/protected",
                headers={"Authorization": f"Bearer {token}"},
            )

    assert response.status_code == 200
    assert response.json() == {"supabase_user_id": str(user_id)}


def test_protected_route_declares_supabase_bearer_security_scheme() -> None:
    schema = _protected_test_app().openapi()

    assert schema["components"]["securitySchemes"]["SupabaseJWT"] == {
        "type": "http",
        "description": "Supabase access token",
        "scheme": "bearer",
        "bearerFormat": "JWT",
    }
    assert schema["paths"]["/protected"]["get"]["security"] == [{"SupabaseJWT": []}]


def _protected_test_app(verifier: SupabaseJWTVerifier | None = None) -> FastAPI:
    application = create_app()
    if verifier is not None:
        application.dependency_overrides[get_supabase_jwt_verifier] = lambda: verifier

    @application.get("/protected")
    async def protected(
        identity: Annotated[
            AuthenticatedIdentity,
            Depends(require_authenticated_identity),
        ],
    ) -> dict[str, str]:
        return {"supabase_user_id": str(identity.supabase_user_id)}

    return application
