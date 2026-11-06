from typing import Any

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    code: str
    message: str
    fields: dict[str, Any] = Field(default_factory=dict)


class ErrorResponse(BaseModel):
    error: ErrorDetail


class AppError(Exception):
    def __init__(
        self,
        *,
        status_code: int,
        code: str,
        message: str,
        fields: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.fields = fields or {}
        self.headers = headers or {}


async def app_error_handler(_: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, AppError):
        raise exc
    response = ErrorResponse(
        error=ErrorDetail(code=exc.code, message=exc.message, fields=exc.fields)
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=response.model_dump(mode="json"),
        headers=exc.headers,
    )


async def validation_error_handler(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, RequestValidationError):
        raise exc
    # Never echo submitted values, validation context or the raw request body.
    fields: dict[str, str] = {}
    for error in exc.errors():
        location = ".".join(str(part) for part in error["loc"])
        fields[location] = "Check this field and try again."
    return await app_error_handler(
        request,
        AppError(
            status_code=422,
            code="validation_error",
            message="Check the supplied details and try again.",
            fields=fields,
        ),
    )
