import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))


def _normalize_db_url(url):
    """Clean the URL and make sure SQLAlchemy uses the psycopg 3 driver."""
    url = (url or "").strip().strip('"').strip("'")
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


_LOCAL_DB = "postgresql+psycopg://tawati_user:tawati_pass@localhost:5432/tawati_chemist"


class BaseConfig:
    SECRET_KEY = os.environ.get("SECRET_KEY", "change-me-in-prod")
    SQLALCHEMY_DATABASE_URI = (
        _normalize_db_url(os.environ.get("DATABASE_URL")) or _LOCAL_DB
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "change-me-jwt-secret")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    JWT_TOKEN_LOCATION = ["headers"]

    # Business rules baked into config so they're easy to tune
        # Comma-separated list of origins allowed to call this API. Defaults to
    # local dev only — set CORS_ORIGINS in your host's env vars to your real
    # deployed frontend URL(s), e.g. "https://tawati4-frontend.onrender.com"
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")
    CURRENCY = "KES"
    PHARMACY_NAME = "Tawati Chemist"
    PPB_LICENSE_NO = os.environ.get("PPB_LICENSE_NO", "PPB/RET/2024-884")


class DevelopmentConfig(BaseConfig):
    DEBUG = True


class ProductionConfig(BaseConfig):
    DEBUG = False


class TestingConfig(BaseConfig):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "TEST_DATABASE_URL", "sqlite:///:memory:"
    )


_CONFIGS = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}


def get_config(name=None):
    name = name or os.environ.get("FLASK_ENV", "development")
    return _CONFIGS.get(name, DevelopmentConfig)