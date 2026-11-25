from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import ApiRequestLog
from app.schemas.log import ApiRequestLogResponse


router = APIRouter(
    prefix="/logs",
    tags=["Logs"],
)


@router.get("", response_model=list[ApiRequestLogResponse])
async def get_logs(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    # Формируем запрос с сортировкой от новых записей к старым
    query = (
        select(ApiRequestLog)
        .order_by(ApiRequestLog.id.desc())
        .offset(offset)
        .limit(limit)
    )

    # Выполняем запрос к SQLite
    result = await db.execute(query)

    # Получаем список записей
    logs = result.scalars().all()

    return logs