
from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health_check():
    # Проверяем, что Backend запущен
    return {
        "status": "ok",
        "message": "Keitaro Wrapper is running"
    }