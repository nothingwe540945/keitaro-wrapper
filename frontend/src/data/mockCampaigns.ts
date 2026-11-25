import type { Campaign } from "../types/campaign";

// Временные кампании для разработки интерфейса
export const mockCampaigns: Campaign[] = [
  {
    id: 42,
    name: "Test Campaign CL",
    alias: "63be3889",
    state: "active",
    domain_id: 1813,
    group_id: 10332,
    traffic_source_id: 836,
    domain: "https://kt-emulator.test/",
  },
  {
    id: 43,
    name: "Test Campaign TH",
    alias: "test-th",
    state: "active",
    domain_id: 1813,
    group_id: 10332,
    traffic_source_id: 836,
    domain: "https://kt-emulator.test/",
  },
  {
    id: 44,
    name: "Test Campaign DE",
    alias: "test-de",
    state: "disabled",
    domain_id: 1813,
    group_id: 10332,
    traffic_source_id: 836,
    domain: "https://kt-emulator.test/",
  },
];
