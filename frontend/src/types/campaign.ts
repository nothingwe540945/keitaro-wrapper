export interface Campaign {
  id: number;
  name: string;
  alias: string;
  state: string;
  domain_id: number;
  group_id: number;
  traffic_source_id: number;
  domain?: string;
}
