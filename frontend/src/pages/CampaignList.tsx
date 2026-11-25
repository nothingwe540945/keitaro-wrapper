import { useEffect, useState } from "react";
import { getCampaigns } from "../api/campaignApi";
import { mockCampaigns } from "../data/mockCampaigns";
import { CampaignTable } from "../components/campaigns/CampaignTable";
import type { Campaign } from "../types/campaign";
import "./CampaignList.css";

export function CampaignList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingMock, setIsUsingMock] = useState(false);

  // Загружаем компании
  async function loadCampaigns() {
    try {
      setIsLoading(true);
      setError(null);
      setIsUsingMock(false);

      // Получаем реальные компании из Backend
      const data = await getCampaigns();

      setCampaigns(data);
    } catch (error) {
      console.error("Ошибка загрузки компаний:", error);

      // Если Backend недоступен, используем тестовые данные
      setCampaigns(structuredClone(mockCampaigns));
      setIsUsingMock(true);
    } finally {
      setIsLoading(false);
    }
  }

  // Загружаем компании при открытии страницы
  useEffect(() => {
    loadCampaigns();
  }, []);

  // Считаем количество активных компаний
  const activeCampaigns = campaigns.filter(
    (campaign) => campaign.state === "active",
  ).length;

  // Считаем количество отключённых компаний
  const disabledCampaigns = campaigns.length - activeCampaigns;

  return (
    <main className="campaign-page">
      <div className="campaign-page__header">
        <div>
          <h1>Компании</h1>
          <p>Управление рекламными компаниями Keitaro</p>
        </div>

        <a href="/campaigns/new" className="campaign-page__create-button">
          + Создать компанию
        </a>
      </div>

      <div className="campaign-page__stats">
        <div className="stat-card">
          <span>Всего компаний</span>
          <strong>{campaigns.length}</strong>
        </div>

        <div className="stat-card">
          <span>Активные</span>
          <strong>{activeCampaigns}</strong>
        </div>

        <div className="stat-card">
          <span>Отключённые</span>
          <strong>{disabledCampaigns}</strong>
        </div>
      </div>

      <section className="campaign-section">
        <div className="campaign-section__header">
          <h2>Все компании</h2>
          <span>{campaigns.length} записей</span>
        </div>

        {isLoading && <p>Загрузка компаний...</p>}

        {isUsingMock && !isLoading && (
          <p>Backend недоступен. Отображаются тестовые данные.</p>
        )}

        {error && (
          <div>
            <p>{error}</p>
            <button onClick={loadCampaigns}>Повторить</button>
          </div>
        )}

        {!isLoading && !error && campaigns.length === 0 && (
          <p>Компании пока отсутствуют</p>
        )}

        {!isLoading && !error && campaigns.length > 0 && (
          <CampaignTable campaigns={campaigns} />
        )}
      </section>
    </main>
  );
}
