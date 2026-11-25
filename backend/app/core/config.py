
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Адрес API Keitaro
    KEITARO_API_URL: str

    # API-ключ Keitaro
    KEITARO_API_KEY: str

    # Настройки кампаний для тестового стенда
    KEITARO_GROUP_ID: str
    KEITARO_DOMAIN_ID: int
    KEITARO_TRAFFIC_SOURCE_ID: int

    # Настройки приложения
    APP_NAME: str = "Keitaro Wrapper"
    DEBUG: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


# Создаём единый экземпляр настроек
settings = Settings()
