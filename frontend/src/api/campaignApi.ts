import { apiClient } from "./client";
import type { Campaign } from "../types/campaign";
import type { CampaignEditorData } from "../types/campaignEditor";

// Данные, необходимые для создания компании
export interface CreateCampaignData {
  name: string;
  country_code: string;
  offer_id: number;
}

// Информация об оффере из Keitaro
export interface Offer {
  id: number;
  name: string;
  group_id: number | null;
  state: string;
  country: string[];
  payout_value: number | null;
  payout_currency: string | null;
  payout_type: string | null;
  action_type: string | null;
}

// Данные оффера для обновления потока
export interface UpdateStreamOffer {
  offer_id: number;
  share: number;
  state: "active" | "disabled";
}

// Получаем список компаний из Backend
export async function getCampaigns(): Promise<Campaign[]> {
  const response = await apiClient.get<Campaign[]>("/campaigns");
  return response.data;
}

// Создаём новую компанию через Backend
export async function createCampaign(data: CreateCampaignData) {
  const response = await apiClient.post("/campaigns", data);
  return response.data;
}

// Получаем данные компании и её потоков для редактора
export async function getCampaignEditor(
  id: number,
): Promise<CampaignEditorData> {
  const response = await apiClient.get<CampaignEditorData>(
    `/campaigns/${id}/editor`,
  );

  return response.data;
}

// Получаем список офферов из Keitaro через Backend
export async function getOffers(): Promise<Offer[]> {
  const response = await apiClient.get<Offer[]>("/offers");
  return response.data;
}

// Обновляем список офферов в потоке
export async function updateStreamOffers(
  streamId: number,
  offers: UpdateStreamOffer[],
) {
  const response = await apiClient.put(
    `/campaigns/streams/${streamId}/offers`,
    { offers },
  );

  return response.data;
}
