import type { Campaign } from "./campaign";
import type { Stream } from "./stream";

// Данные компании и её потоков для редактора
export interface CampaignEditorData {
  campaign: Campaign;
  streams: Stream[];
}
