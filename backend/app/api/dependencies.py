
from fastapi import Request

from app.services.keitaro import KeitaroClient


def get_keitaro_client(request: Request) -> KeitaroClient:
    # Получаем общий HTTP-клиент из состояния приложения
    return request.app.state.keitaro
