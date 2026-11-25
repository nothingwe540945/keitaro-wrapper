
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, JSON, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# Базовый класс для всех моделей базы данных
class Base(DeclarativeBase):
    pass

# Модель журнала запросов к Keitaro
class ApiRequestLog(Base):
    __tablename__ = "api_request_logs"

    # Уникальный ID записи
    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    # HTTP-метод: GET, POST, PUT, DELETE
    method: Mapped[str] = mapped_column(String(10))

    # Адрес API, к которому обращались
    endpoint: Mapped[str] = mapped_column(String(255))

    # Тело отправленного запроса
    request_body: Mapped[dict | list | None] = mapped_column(
        JSON,
        nullable=True,
    )

    # HTTP-код ответа Keitaro
    response_status: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    # Тело ответа Keitaro: JSON или обычный текст
    response_body: Mapped[dict | list | str | None] = mapped_column(
        JSON,
        nullable=True,
    )

    # Время выполнения запроса в миллисекундах
    duration_ms: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    # Сообщение об ошибке, если запрос завершился неудачно
    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # Дата и время создания записи
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )