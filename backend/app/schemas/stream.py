
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class StreamOffer(BaseModel):
    # ID оффера в Keitaro
    offer_id: int = Field(gt=0)

    # Доля трафика, направляемая на оффер
    share: int = Field(ge=0, le=100)

    # Состояние оффера: активен или отключён
    state: Literal["active", "disabled"] = "active"


class GeoStreamCreate(BaseModel):
    # ID кампании, к которой относится поток
    campaign_id: int = Field(gt=0)

    # Название потока
    name: str = Field(min_length=1, max_length=255)

    # GEO-код страны
    country_code: str = Field(pattern=r"^[A-Za-z]{2}$")

    @field_validator("country_code")
    @classmethod
    def normalize_country_code(cls, value: str) -> str:
        # Приводим GEO-код к верхнему регистру
        return value.upper()

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        # Убираем пробелы по краям названия
        value = value.strip()

        if not value:
            raise ValueError("Название потока не может быть пустым")

        return value


class OfferStreamCreate(BaseModel):
    # ID кампании, к которой относится поток
    campaign_id: int = Field(gt=0)

    # Название потока
    name: str = Field(min_length=1, max_length=255)

    # Список офферов
    offers: list[StreamOffer] = Field(min_length=1)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        # Убираем пробелы по краям названия
        value = value.strip()

        if not value:
            raise ValueError("Название потока не может быть пустым")

        return value


class OfferStreamUpdate(BaseModel):
    # Полный список офферов после редактирования
    offers: list[StreamOffer] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_offers(self):
        # Проверяем, что ID офферов не повторяются
        offer_ids = [offer.offer_id for offer in self.offers]

        if len(offer_ids) != len(set(offer_ids)):
            raise ValueError("Офферы не должны повторяться")

        # Получаем только активные офферы
        active_offers = [
            offer
            for offer in self.offers
            if offer.state == "active"
        ]

        # В потоке должен остаться хотя бы один активный оффер
        if not active_offers:
            raise ValueError(
                "В потоке должен остаться хотя бы один активный оффер"
            )

        # Сумма долей активных офферов должна составлять 100%
        total_share = sum(offer.share for offer in active_offers)

        if total_share != 100:
            raise ValueError(
                "Сумма долей активных офферов должна составлять 100%"
            )

        return self
