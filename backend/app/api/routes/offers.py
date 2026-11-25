
import httpx

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_keitaro_client
from app.services.keitaro import KeitaroClient

from app.schemas.offer import OfferResponse


router = APIRouter(
    prefix="/offers",
    tags=["Offers"],
)


@router.get("", response_model=list[OfferResponse])
async def get_offers(
    client: KeitaroClient = Depends(get_keitaro_client),
):
    # Запрашиваем список офферов из Keitaro
    try:
        offers = await client.request("GET", "/offers")
        return offers

    except httpx.HTTPStatusError as error:
        # Keitaro вернул HTTP-ошибку
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Keitaro API вернул ошибку",
                "keitaro_status_code": error.response.status_code,
            },
        ) from error

    except httpx.RequestError as error:
        # Не удалось подключиться к Keitaro
        raise HTTPException(
            status_code=502,
            detail="Не удалось подключиться к Keitaro API",
        ) from error
