
from app.services.keitaro import KeitaroClient

class StreamService:
    def __init__(self, client: KeitaroClient):
        # Получаем общий HTTP-клиент для работы с Keitaro
        self.client = client

    async def create_geo_stream(
        self,
        campaign_id: int,
        country_code: str,
    ):
        # Подготавливаем GEO-поток с редиректом на Google
        payload = {
            "campaign_id": campaign_id,
            "name": f"Geo {country_code}",
            "type": "regular",
            "schema": "redirect",
            "action_type": "http",
            "action_payload": "https://google.com",
            "filters": [
                {
                    "name": "country",
                    "mode": "accept",
                    "payload": [country_code],
                }
            ],
        }

        # Создаём поток в Keitaro
        return await self.client.request(
            "POST",
            "/streams",
            json=payload,
        )

    async def create_offer_stream(
        self,
        campaign_id: int,
        offer_id: int,
    ):
        # Подготавливаем поток с выбранным оффером
        payload = {
            "campaign_id": campaign_id,
            "name": "Offers",
            "type": "default",
            "schema": "landings",
            "offers": [
                {
                    "offer_id": offer_id,
                    "share": 100,
                    "state": "active",
                }
            ],
        }

        # Создаём поток в Keitaro
        return await self.client.request(
            "POST",
            "/streams",
            json=payload,
        )