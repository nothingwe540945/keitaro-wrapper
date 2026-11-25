
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import health, offers, reference, campaigns, logs
from app.services.keitaro import KeitaroClient
from app.db.database import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Создаём HTTP-клиент для работы с Keitaro
    app.state.keitaro = KeitaroClient()

    yield

    # Закрываем HTTP-клиент
    await app.state.keitaro.close()

    # Закрываем соединения с базой данных
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# Разрешаем Frontend обращаться к Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем маршруты приложения
app.include_router(health.router, tags=["Health"])
app.include_router(offers.router)
app.include_router(reference.router)
app.include_router(campaigns.router)
app.include_router(logs.router)


@app.get("/")
async def root():
    return {"message": "Welcome to Keitaro Wrapper"}
