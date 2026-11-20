"""Replaceable external-service providers."""

from app.providers.ai.base import AIProvider
from app.providers.ai.mock import MockAIProvider

try:
    from app.providers.ai.gemini import GeminiProvider
except ImportError:
    GeminiProvider = None  # type: ignore

__all__ = ["AIProvider", "GeminiProvider", "MockAIProvider"]
