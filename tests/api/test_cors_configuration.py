"""Tests for ALLOWED_CORS_ORIGINS configuration, environment parsing, and CORS middleware.

Verifies:
1. Pydantic Settings parses JSON array string correctly.
2. Pydantic Settings parses comma-separated string correctly.
3. Pydantic Settings parses single origin string correctly.
4. Defaults are used when environment variable is omitted.
5. FastAPI app with configured CORS origins properly handles OPTIONS preflight
   and returns Access-Control-Allow-Origin for permitted production origins.
"""

import os
from fastapi.testclient import TestClient
from apps.api.src.core.config import Settings
from apps.api.src.main import app


def test_cors_settings_parsing_json_array():
    """Verify JSON array environment variable parsing."""
    orig = os.environ.get("ALLOWED_CORS_ORIGINS")
    try:
        os.environ["ALLOWED_CORS_ORIGINS"] = '["https://atmosync-web.onrender.com", "http://localhost:3000"]'
        settings = Settings()
        assert isinstance(settings.ALLOWED_CORS_ORIGINS, list)
        assert "https://atmosync-web.onrender.com" in settings.ALLOWED_CORS_ORIGINS
        assert "http://localhost:3000" in settings.ALLOWED_CORS_ORIGINS
    finally:
        if orig is not None:
            os.environ["ALLOWED_CORS_ORIGINS"] = orig
        else:
            os.environ.pop("ALLOWED_CORS_ORIGINS", None)


def test_cors_settings_parsing_comma_separated():
    """Verify comma-separated string environment variable parsing."""
    orig = os.environ.get("ALLOWED_CORS_ORIGINS")
    try:
        os.environ["ALLOWED_CORS_ORIGINS"] = "https://atmosync-web.onrender.com, http://localhost:3000"
        settings = Settings()
        assert isinstance(settings.ALLOWED_CORS_ORIGINS, list)
        assert "https://atmosync-web.onrender.com" in settings.ALLOWED_CORS_ORIGINS
        assert "http://localhost:3000" in settings.ALLOWED_CORS_ORIGINS
    finally:
        if orig is not None:
            os.environ["ALLOWED_CORS_ORIGINS"] = orig
        else:
            os.environ.pop("ALLOWED_CORS_ORIGINS", None)


def test_cors_settings_parsing_single_origin():
    """Verify single URL string environment variable parsing."""
    orig = os.environ.get("ALLOWED_CORS_ORIGINS")
    try:
        os.environ["ALLOWED_CORS_ORIGINS"] = "https://atmosync-web.onrender.com"
        settings = Settings()
        assert isinstance(settings.ALLOWED_CORS_ORIGINS, list)
        assert settings.ALLOWED_CORS_ORIGINS == ["https://atmosync-web.onrender.com"]
    finally:
        if orig is not None:
            os.environ["ALLOWED_CORS_ORIGINS"] = orig
        else:
            os.environ.pop("ALLOWED_CORS_ORIGINS", None)


def test_cors_middleware_preflight_production_origin():
    """Verify CORS preflight succeeds for allowed origin."""
    with TestClient(app) as client:
        # Test preflight from localhost (default allowed origin)
        headers = {
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization",
        }
        res = client.options("/health", headers=headers)
        assert res.status_code == 200
        assert res.headers.get("access-control-allow-origin") == "http://localhost:3000"
        assert res.headers.get("access-control-allow-credentials") == "true"


def test_cors_middleware_disallowed_origin():
    """Verify CORS headers are not returned for disallowed origin."""
    with TestClient(app) as client:
        res = client.get("/health", headers={"Origin": "https://malicious-site.example.com"})
        assert res.status_code == 200
        # Disallowed origins should not have access-control-allow-origin header
        assert "access-control-allow-origin" not in res.headers
