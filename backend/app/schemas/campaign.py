
from pydantic import BaseModel, Field, field_validator


class CampaignCreate(BaseModel):
    # Название новой кампании
    name: str = Field(min_length=1, max_length=255)

    # Двухбуквенный код страны, например CL, DE, PL
    country_code: str = Field(pattern=r"^[A-Za-z]{2}$")

    # ID существующего оффера в Keitaro
    offer_id: int = Field(gt=0)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        # Убираем пробелы по краям названия
        value = value.strip()

        if not value:
            raise ValueError("Название кампании не может быть пустым")

        return value

    @field_validator("country_code")
    @classmethod
    def normalize_country_code(cls, value: str) -> str:
        # Приводим GEO-код к верхнему регистру
        return value.upper()


class CampaignStreamsCreate(BaseModel):
    # GEO-код страны
    country_code: str = Field(pattern=r"^[A-Za-z]{2}$")

    # ID существующего оффера
    offer_id: int = Field(gt=0)

    @field_validator("country_code")
    @classmethod
    def normalize_country_code(cls, value: str) -> str:
        # Приводим GEO-код к верхнему регистру
        return value.upper()
