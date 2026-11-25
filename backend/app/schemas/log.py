from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ApiRequestLogResponse(BaseModel):
    # Разрешаем создавать схему из объекта SQLAlchemy
    model_config = ConfigDict(from_attributes=True)

    id: int
    method: str
    endpoint: str
    request_body: dict | list | None = None
    response_status: int | None = None
    response_body: dict | list | str | None = None
    duration_ms: float | None = None
    error_message: str | None = None
    created_at: datetime