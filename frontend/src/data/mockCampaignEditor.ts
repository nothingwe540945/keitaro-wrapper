import type { CampaignEditorData } from "../types/campaignEditor";

// Тестовые данные редактора компании №42
export const mockCampaignEditor: CampaignEditorData = {
  campaign: {
    id: 42,
    name: "Test Campaign CL",
    alias: "63be3889",
    state: "active",
    domain_id: 1813,
    group_id: 10332,
    traffic_source_id: 836,
    domain: "https://kt-emulator.test/",
  },

  streams: [
    {
      id: 77,
      campaign_id: 42,
      schema: "redirect",
      type: "regular",
      name: "GEO — Chile",
      filters: [
        {
          id: 1,
          stream_id: 77,
          name: "Country",
          mode: "accept",
          payload: ["CL"],
        },
      ],
      offers: [],
    },
    {
      id: 78,
      campaign_id: 42,
      schema: "redirect",
      type: "regular",
      name: "Offers",
      filters: [],
      offers: [
        {
          id: 1,
          stream_id: 78,
          offer_id: 18001,
          share: 60,
          state: "active",
        },
        {
          id: 2,
          stream_id: 78,
          offer_id: 18002,
          share: 40,
          state: "active",
        },
      ],
    },
  ],
};
