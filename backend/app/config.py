import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "MindTrace API"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"

    # SQLite local database by default
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./mindtrace.db")

    # CORS allowed origins (frontend dev & vercel)
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "https://*.vercel.app"
    ]

    # Supabase Auth configuration (optional in local dev, strictly verified when provided)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")

    # Local dev auth bypass / test mode
    LOCAL_AUTH_DEV_MODE: bool = os.getenv("LOCAL_AUTH_DEV_MODE", "true").lower() in ("true", "1")

    model_config = SettingsConfigDict(case_sensitive=True)

settings = Settings()
