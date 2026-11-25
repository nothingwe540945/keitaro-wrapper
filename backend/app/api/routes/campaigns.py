
import httpx

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.dependencies import get_keitaro_client
from app.core.config import settings
from app.schemas.campaign import CampaignCreate, CampaignStreamsCreate
from app.schemas.stream import OfferStreamUpdate
from app.services.keitaro import KeitaroClient
from app.services.streams import StreamService


router = APIRouter(
    prefix="/campaigns",
    tags=["Campaigns"],
)


async def rollback_stream(
    client: KeitaroClient,
    stream_id: int,
) -> str | None:
    # Пытаемся удалить ранее созданный поток
    try:
        await client.request(
            "DELETE",
            f"/streams/{stream_id}",
        )

        return None

    except httpx.HTTPError as error:
        # Возвращаем информацию об ошибке отката
        return str(error)


@router.get("")
async def get_campaigns(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    client: KeitaroClient = Depends(get_keitaro_client),
):
    # Получаем список кампаний из Keitaro
    try:
        campaigns = await client.request(
            "GET",
            "/campaigns",
            params={
                "limit": limit,
                "offset": offset,
            },
        )

        return campaigns

    except httpx.HTTPStatusError as error:
        # Обрабатываем ошибки, возвращённые Keitaro
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "message": "Не удалось получить список кампаний",
                "keitaro_status_code": error.response.status_code,
            },
        ) from error

    except httpx.RequestError as error:
        # Обрабатываем проблемы с подключением
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Не удалось подключиться к Keitaro API",
        ) from error


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_campaign(
    campaign_data: CampaignCreate,
    client: KeitaroClient = Depends(get_keitaro_client),
):
    # Подготавливаем данные для создания кампании
    payload = {
        "name": campaign_data.name,
        "group_id": settings.KEITARO_GROUP_ID,
        "domain_id": settings.KEITARO_DOMAIN_ID,
        "traffic_source_id": settings.KEITARO_TRAFFIC_SOURCE_ID,
    }

    campaign = None
    geo_stream = None
    current_step = "проверка оффера"

    try:
        # Проверяем, существует ли выбранный оффер
        await client.request(
            "GET",
            f"/offers/{campaign_data.offer_id}",
        )

        # Создаём кампанию в Keitaro
        current_step = "создание кампании"

        campaign = await client.request(
            "POST",
            "/campaigns",
            json=payload,
        )

        # Создаём сервис для работы с потоками
        stream_service = StreamService(client)

        # Создаём GEO-поток
        current_step = "создание GEO-потока"

        geo_stream = await stream_service.create_geo_stream(
            campaign_id=campaign["id"],
            country_code=campaign_data.country_code,
        )

        # Создаём поток с выбранным оффером
        current_step = "создание потока офферов"

        offer_stream = await stream_service.create_offer_stream(
            campaign_id=campaign["id"],
            offer_id=campaign_data.offer_id,
        )

        # Возвращаем результаты всех операций
        return {
            "campaign": campaign,
            "streams": {
                "geo": geo_stream,
                "offers": offer_stream,
            },
        }

    except httpx.HTTPStatusError as error:
        # Если оффер не найден, возвращаем ошибку 404
        if (
            current_step == "проверка оффера"
            and error.response.status_code == 404
        ):
            response_status = status.HTTP_404_NOT_FOUND
            message = "Выбранный оффер не найден в Keitaro"
        else:
            response_status = status.HTTP_502_BAD_GATEWAY
            message = f"Ошибка на этапе: {current_step}"

        # Если GEO-поток уже создан, пытаемся его удалить
        rollback_error = None

        if geo_stream:
            rollback_error = await rollback_stream(
                client,
                geo_stream["id"],
            )

        raise HTTPException(
            status_code=response_status,
            detail={
                "message": message,
                "keitaro_status_code": error.response.status_code,
                "campaign_id": campaign.get("id") if campaign else None,
                "rollback_status": (
                    "failed" if rollback_error
                    else "completed" if geo_stream
                    else "not_needed"
                ),
                "rollback_error": rollback_error,
            },
        ) from error

    except httpx.RequestError as error:
        # Если GEO-поток уже создан, пытаемся его удалить
        rollback_error = None

        if geo_stream:
            rollback_error = await rollback_stream(
                client,
                geo_stream["id"],
            )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "message": (
                    f"Не удалось подключиться к Keitaro "
                    f"на этапе: {current_step}"
                ),
                "campaign_id": campaign.get("id") if campaign else None,
                "rollback_status": (
                    "failed" if rollback_error
                    else "completed" if geo_stream
                    else "not_needed"
                ),
                "rollback_error": rollback_error,
            },
        ) from error


@router.get("/{campaign_id}/streams")
async def get_campaign_streams(
    campaign_id: int,
    client: KeitaroClient = Depends(get_keitaro_client),
):
    # Получаем все потоки выбранной кампании из Keitaro
    try:
        streams = await client.request(
            "GET",
            f"/campaigns/{campaign_id}/streams",
        )

        return streams

    except httpx.HTTPStatusError as error:
        # Если кампания или потоки не найдены, возвращаем 404
        if error.response.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Кампания или её потоки не найдены",
            ) from error

        # Обрабатываем остальные ошибки Keitaro
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "message": "Не удалось получить потоки кампании",
                "keitaro_status_code": error.response.status_code,
            },
        ) from error

    except httpx.RequestError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Не удалось подключиться к Keitaro API",
        ) from error


@router.post("/{campaign_id}/streams")
async def create_campaign_streams(
    campaign_id: int,
    data: CampaignStreamsCreate,
    client: KeitaroClient = Depends(get_keitaro_client),
):
    # Создаём сервис для работы с потоками
    stream_service = StreamService(client)

    current_step = "проверка кампании"
    geo_stream = None

    try:
        # Проверяем, существует ли кампания
        await client.request(
            "GET",
            f"/campaigns/{campaign_id}",
        )

        # Проверяем существование выбранного оффера
        current_step = "проверка оффера"

        await client.request(
            "GET",
            f"/offers/{data.offer_id}",
        )

        # Создаём GEO-поток
        current_step = "создание GEO-потока"

        geo_stream = await stream_service.create_geo_stream(
            campaign_id=campaign_id,
            country_code=data.country_code,
        )

        # Создаём поток офферов
        current_step = "создание потока офферов"

        offer_stream = await stream_service.create_offer_stream(
            campaign_id=campaign_id,
            offer_id=data.offer_id,
        )

        return {
            "message": "Потоки успешно созданы",
            "geo_stream": geo_stream,
            "offer_stream": offer_stream,
        }

    except httpx.HTTPStatusError as error:
        # Определяем тип ошибки
        if (
            current_step == "проверка кампании"
            and error.response.status_code == 404
        ):
            response_status = status.HTTP_404_NOT_FOUND
            message = "Кампания не найдена в Keitaro"

        elif (
            current_step == "проверка оффера"
            and error.response.status_code == 404
        ):
            response_status = status.HTTP_404_NOT_FOUND
            message = "Выбранный оффер не найден в Keitaro"

        else:
            response_status = status.HTTP_502_BAD_GATEWAY
            message = f"Ошибка на этапе: {current_step}"

        # Если GEO-поток уже создан, пытаемся его удалить
        rollback_error = None

        if geo_stream:
            rollback_error = await rollback_stream(
                client,
                geo_stream["id"],
            )

        raise HTTPException(
            status_code=response_status,
            detail={
                "message": message,
                "keitaro_status_code": error.response.status_code,
                "campaign_id": campaign_id,
                "geo_stream_id": geo_stream.get("id") if geo_stream else None,
                "rollback_status": (
                    "failed" if rollback_error
                    else "completed" if geo_stream
                    else "not_needed"
                ),
                "rollback_error": rollback_error,
            },
        ) from error

    except httpx.RequestError as error:
        # Если GEO-поток уже создан, пытаемся его удалить
        rollback_error = None

        if geo_stream:
            rollback_error = await rollback_stream(
                client,
                geo_stream["id"],
            )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "message": f"Ошибка подключения на этапе: {current_step}",
                "campaign_id": campaign_id,
                "geo_stream_id": geo_stream.get("id") if geo_stream else None,
                "rollback_status": (
                    "failed" if rollback_error
                    else "completed" if geo_stream
                    else "not_needed"
                ),
                "rollback_error": rollback_error,
            },
        ) from error


@router.put("/streams/{stream_id}/offers")
async def update_stream_offers(
    stream_id: int,
    data: OfferStreamUpdate,
    client: KeitaroClient = Depends(get_keitaro_client),
):
    current_step = "проверка потока"

    try:
        # Проверяем, существует ли поток
        stream = await client.request(
            "GET",
            f"/streams/{stream_id}",
        )

        # Проверяем существование каждого переданного оффера
        for offer in data.offers:
            current_step = f"проверка оффера {offer.offer_id}"

            await client.request(
                "GET",
                f"/offers/{offer.offer_id}",
            )

        # Обновляем полный список офферов в потоке
        current_step = "обновление списка офферов"

        updated_stream = await client.request(
            "PUT",
            f"/streams/{stream_id}",
            json={
                "offers": [
                    offer.model_dump()
                    for offer in data.offers
                ]
            },
        )

        return {
            "message": "Список офферов успешно обновлён",
            "stream_id": stream["id"],
            "offers": updated_stream["offers"],
        }

    except httpx.HTTPStatusError as error:
        # Если поток не найден, возвращаем 404
        if (
            current_step == "проверка потока"
            and error.response.status_code == 404
        ):
            response_status = status.HTTP_404_NOT_FOUND
            message = "Поток не найден"

        # Если оффер не найден, возвращаем 404
        elif (
            current_step.startswith("проверка оффера")
            and error.response.status_code == 404
        ):
            response_status = status.HTTP_404_NOT_FOUND
            message = f"Оффер не найден: {current_step}"

        else:
            response_status = status.HTTP_502_BAD_GATEWAY
            message = f"Не удалось выполнить операцию: {current_step}"

        raise HTTPException(
            status_code=response_status,
            detail={
                "message": message,
                "keitaro_status_code": error.response.status_code,
                "stream_id": stream_id,
            },
        ) from error

    except httpx.RequestError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "message": f"Не удалось подключиться к Keitaro: {current_step}",
                "stream_id": stream_id,
            },
        ) from error


@router.get("/{campaign_id}")
async def get_campaign(
    campaign_id: int,
    client: KeitaroClient = Depends(get_keitaro_client),
):
    # Получаем информацию о кампании из Keitaro
    try:
        campaign = await client.request(
            "GET",
            f"/campaigns/{campaign_id}",
        )

        return campaign

    except httpx.HTTPStatusError as error:
        # Если кампания не найдена, возвращаем 404
        if error.response.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Кампания не найдена",
            ) from error

        # Обрабатываем остальные ошибки Keitaro
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "message": "Не удалось получить кампанию",
                "keitaro_status_code": error.response.status_code,
            },
        ) from error

    except httpx.RequestError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Не удалось подключиться к Keitaro API",
        ) from error


@router.get("/{campaign_id}/editor")
async def get_campaign_editor(
    campaign_id: int,
    client: KeitaroClient = Depends(get_keitaro_client),
):
    try:
        # Получаем информацию о кампании
        campaign = await client.request(
            "GET",
            f"/campaigns/{campaign_id}",
        )

        # Получаем потоки кампании
        streams = await client.request(
            "GET",
            f"/campaigns/{campaign_id}/streams",
        )

        # Объединяем данные для редактора
        return {
            "campaign": campaign,
            "streams": streams,
        }

    except httpx.HTTPStatusError as error:
        # Если кампания не найдена, возвращаем 404
        if error.response.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Кампания не найдена",
            ) from error

        # Остальные ошибки Keitaro считаем ошибками внешнего сервиса
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "message": "Не удалось загрузить данные редактора",
                "keitaro_status_code": error.response.status_code,
            },
        ) from error

    except httpx.RequestError as error:
        # Обрабатываем проблемы с подключением к Keitaro
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Не удалось подключиться к Keitaro API",
        ) from error
