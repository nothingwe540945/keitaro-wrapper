// Типы схемы потока в Keitaro
export type StreamSchema = "landings" | "redirect" | "action";

// Тип потока
export type StreamType = "forced" | "regular" | "default";

// Состояние оффера
export type OfferState = "active" | "disabled";

// Оффер внутри потока
export interface StreamOffer {
  id: number;
  stream_id: number;
  offer_id: number;
  share: number;
  state: OfferState;
}

// Фильтр потока
export interface StreamFilter {
  id?: number;
  stream_id?: number;
  name: string;
  mode: "accept" | "reject";
  payload: string[];
}

// Поток компании
export interface Stream {
  id: number;
  campaign_id: number;
  schema: StreamSchema;
  type: StreamType;
  name: string;
  action_type?: string;
  action_options?: Record<string, unknown>;
  filters: StreamFilter[];
  offers: StreamOffer[];
  state?: "active" | "disabled";
  created_at?: string;
  updated_at?: string;
}
