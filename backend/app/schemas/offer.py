
from pydantic import BaseModel, ConfigDict, Field


class OfferResponse(BaseModel):
    # Разрешаем игнорировать дополнительные поля Keitaro
    model_config = ConfigDict(extra="ignore")

    id: int
    name: str
    group_id: int | None = None
    state: str

    # Географические страны, для которых предназначен оффер
    country: list[str] = Field(default_factory=list)

    # Информация о выплате
    payout_value: float | None = None
    payout_currency: str | None = None
    payout_type: str | None = None

    # Тип действия оффера
    action_type: str | None = None
