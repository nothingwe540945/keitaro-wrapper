
import httpx

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_keitaro_client
from app.services.keitaro import KeitaroClient


router = APIRouter(
    prefix="/reference",
    tags=["Reference data"],
)


@router.get("/groups")
async def get_campaign_groups(
    client: KeitaroClient = Depends(get_keitaro_client),
):
    # Получаем группы кампаний из Keitaro
    try:
        groups = await client.request(
            "GET",
            "/groups",
            params={"type": "campaigns"},
        )

        return groups

    except httpx.HTTPStatusError as error:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Keitaro API вернул ошибку",
                "keitaro_status_code": error.response.status_code,
            },
        ) from error

    except httpx.RequestError as error:
        raise HTTPException(
            status_code=502,
            detail="Не удалось подключиться к Keitaro API",
        ) from error

@router.get("/domains")
async def get_domains(
    client: KeitaroClient = Depends(get_keitaro_client),
):
    # Получаем список доменов из Keitaro
    try:
        domains = await client.request("GET", "/domains")
        return domains

    except httpx.HTTPStatusError as error:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Keitaro API вернул ошибку",
                "keitaro_status_code": error.response.status_code,
            },
        ) from error

    except httpx.RequestError as error:
        raise HTTPException(
            status_code=502,
            detail="Не удалось подключиться к Keitaro API",
        ) from error

@router.get("/traffic-sources")
async def get_traffic_sources(
    client: KeitaroClient = Depends(get_keitaro_client),
):
    # Получаем список источников трафика из Keitaro
    try:
        traffic_sources = await client.request(
            "GET",
            "/traffic_sources",
        )
        return traffic_sources

    except httpx.HTTPStatusError as error:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Keitaro API вернул ошибку",
                "keitaro_status_code": error.response.status_code,
            },
        ) from error

    except httpx.RequestError as error:
        raise HTTPException(
            status_code=502,
            detail="Не удалось подключиться к Keitaro API",
        ) from error
