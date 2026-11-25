
import logging
import time

import httpx

from app.core.config import settings
from app.db.database import AsyncSessionLocal
from app.db.models import ApiRequestLog


# Настраиваем логирование ошибок приложения
logger = logging.getLogger(__name__)


class KeitaroClient:
    def __init__(self):
        # Создаём HTTP-клиент для работы с Keitaro
        self.client = httpx.AsyncClient(
            base_url=settings.KEITARO_API_URL,
            headers={
                "Api-Key": settings.KEITARO_API_KEY,
            },
            timeout=20.0,
        )

    async def _save_log(
        self,
        method: str,
        endpoint: str,
        request_body: dict | list | None,
        response_status: int | None,
        response_body: dict | list | str | None,
        duration_ms: float,
        error_message: str | None = None,
    ):
        # Сохраняем информацию о запросе в локальную базу данных
        try:
            async with AsyncSessionLocal() as session:
                log = ApiRequestLog(
                    method=method,
                    endpoint=endpoint,
                    request_body=request_body,
                    response_status=response_status,
                    response_body=response_body,
                    duration_ms=duration_ms,
                    error_message=error_message,
                )

                session.add(log)
                await session.commit()

        except Exception:
            # Ошибка записи журнала не должна ломать основной запрос
            logger.exception("Не удалось сохранить запись в журнал запросов")

    async def request(self, method: str, endpoint: str, **kwargs):
        # Запоминаем время начала запроса
        start_time = time.perf_counter()

        # Получаем тело отправляемого запроса
        request_body = kwargs.get("json")

        try:
            # Отправляем запрос в Keitaro
            response = await self.client.request(
                method=method,
                url=endpoint,
                **kwargs,
            )

            # Пытаемся получить JSON из ответа
            try:
                response_body = (
                    response.json() if response.content else None
                )
            except ValueError:
                # Если ответ не JSON, сохраняем его как обычный текст
                response_body = response.text

            # Вычисляем время выполнения запроса
            duration_ms = (time.perf_counter() - start_time) * 1000

            # Сохраняем результат запроса
            await self._save_log(
                method=method,
                endpoint=endpoint,
                request_body=request_body,
                response_status=response.status_code,
                response_body=response_body,
                duration_ms=duration_ms,
            )

            # Проверяем HTTP-ошибку после сохранения ответа
            response.raise_for_status()

            return response_body

        except httpx.RequestError as error:
            # Запрос не получил корректного HTTP-ответа
            duration_ms = (time.perf_counter() - start_time) * 1000

            await self._save_log(
                method=method,
                endpoint=endpoint,
                request_body=request_body,
                response_status=None,
                response_body=None,
                duration_ms=duration_ms,
                error_message=str(error),
            )

            raise

    async def close(self):
        # Закрываем HTTP-клиент и освобождаем ресурсы
        await self.client.aclose()
