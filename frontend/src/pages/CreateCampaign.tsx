import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { createCampaign, getOffers } from "../api/campaignApi";
import type { Offer } from "../api/campaignApi";
import { mockOffers } from "../data/mockOffers";
import "./CreateCampaign.css";

export function CreateCampaign() {
  const navigate = useNavigate();

  // Значения полей формы.
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("");

  // Каталог офферов и поиск.
  const [availableOffers, setAvailableOffers] = useState<Offer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoadingOffers, setIsLoadingOffers] = useState(true);
  const [isMockOfferList, setIsMockOfferList] = useState(false);

  // Состояния отправки формы и ошибок.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загружаем каталог офферов из API.
  useEffect(() => {
    async function loadOffers() {
      try {
        const offers = await getOffers();
        setAvailableOffers(offers);
        setIsMockOfferList(false);
      } catch (requestError) {
        console.error("Ошибка загрузки офферов:", requestError);

        // Используем тестовый каталог только для просмотра.
        setAvailableOffers(structuredClone(mockOffers));
        setIsMockOfferList(true);
      } finally {
        setIsLoadingOffers(false);
      }
    }

    loadOffers();
  }, []);

  // Фильтруем офферы по ID или названию.
  const filteredOffers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return [];

    return availableOffers
      .filter(
        (offer) =>
          String(offer.id).includes(query) ||
          offer.name.toLowerCase().includes(query),
      )
      .slice(0, 10);
  }, [availableOffers, searchQuery]);

  // Выбираем оффер из результатов поиска.
  function handleSelectOffer(offer: Offer) {
    setSelectedOffer(offer);
    setSearchQuery(`${offer.name} (ID: ${offer.id})`);
    setIsSearchOpen(false);
    setError(null);
  }

  // Отправляем данные на Backend.
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Введите название компании");
      return;
    }

    if (!/^[A-Za-z]{2}$/.test(countryCode.trim())) {
      setError("Введите корректный двухбуквенный код страны");
      return;
    }

    if (!selectedOffer) {
      setError("Выберите оффер из списка");
      return;
    }

    // Не разрешаем отправлять тестовые ID в Keitaro.
    if (isMockOfferList) {
      setError(
        "Нельзя создать компанию: используется тестовый каталог офферов. Проверьте соединение с API.",
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await createCampaign({
        name: name.trim(),
        country_code: countryCode.trim().toUpperCase(),
        offer_id: selectedOffer.id,
      });

      // После создания открываем редактор новой компании.
      navigate(`/campaigns/${result.campaign.id}`);
    } catch (requestError) {
      console.error("Ошибка создания компании:", requestError);

      if (axios.isAxiosError(requestError)) {
        const detail = requestError.response?.data?.detail;

        if (typeof detail === "string") {
          setError(detail);
        } else if (detail && typeof detail === "object") {
          setError(detail.message ?? "Не удалось создать компанию");
        } else {
          setError("Не удалось создать компанию");
        }
      } else {
        setError("Произошла непредвиденная ошибка");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="create-campaign">
      <Link to="/" className="create-campaign__back">
        ← Вернуться к компаниям
      </Link>

      <div className="create-campaign__header">
        <h1>Создание компании</h1>
        <p>Укажите основные параметры новой компании</p>
      </div>

      <form className="create-campaign__form" onSubmit={handleSubmit}>
        <div className="create-campaign__field">
          <label htmlFor="campaign-name">Название компании</label>

          <input
            id="campaign-name"
            type="text"
            placeholder="Например, Test Company TH"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={255}
          />
        </div>

        <div className="create-campaign__field">
          <label htmlFor="country-code">GEO страны</label>

          <input
            id="country-code"
            type="text"
            placeholder="Например, TH"
            value={countryCode}
            onChange={(event) =>
              setCountryCode(event.target.value.toUpperCase())
            }
            required
            minLength={2}
            maxLength={2}
            pattern="[A-Za-z]{2}"
            title="Введите двухбуквенный код страны, например TH"
          />

          <span>Двухбуквенный код страны, например TH или CL</span>
        </div>

        <div className="create-campaign__field">
          <label htmlFor="offer-search">Оффер в Keitaro</label>

          <div className="create-campaign__search">
            <input
              id="offer-search"
              type="text"
              placeholder="Поиск по ID или названию оффера"
              value={searchQuery}
              onFocus={() => setIsSearchOpen(true)}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSelectedOffer(null);
                setIsSearchOpen(true);
                setError(null);
              }}
              autoComplete="off"
              required
            />

            {isSearchOpen && searchQuery.trim() !== "" && (
              <div className="create-campaign__search-results">
                {isLoadingOffers ? (
                  <p>Загрузка офферов...</p>
                ) : filteredOffers.length > 0 ? (
                  filteredOffers.map((offer) => (
                    <button
                      type="button"
                      key={offer.id}
                      className="create-campaign__search-result"
                      onClick={() => handleSelectOffer(offer)}
                    >
                      <span>{offer.name}</span>
                      <span>ID: {offer.id}</span>
                    </button>
                  ))
                ) : (
                  <p>Подходящие офферы не найдены</p>
                )}
              </div>
            )}
          </div>

          {selectedOffer && (
            <span>
              Выбран оффер: {selectedOffer.name}, ID: {selectedOffer.id}
            </span>
          )}

          {isMockOfferList && (
            <span className="create-campaign__mock-note">
              Используется тестовый каталог. Создание компании недоступно.
            </span>
          )}
        </div>

        {error && <div className="create-campaign__error">{error}</div>}

        <div className="create-campaign__actions">
          <Link to="/" className="create-campaign__cancel">
            Отмена
          </Link>

          <button
            type="submit"
            disabled={isSubmitting || isLoadingOffers || isMockOfferList}
          >
            {isSubmitting ? "Создание..." : "Создать компанию"}
          </button>
        </div>
      </form>
    </main>
  );
}
