import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:postgres@db:5432/cspm"
    )
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", 
        "super-secret-cspm-platform-key-change-in-prod"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 180

    class Config:
        env_file = ".env"

settings = Settings()
