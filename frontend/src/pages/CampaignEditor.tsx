import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getCampaignEditor,
  getOffers,
  updateStreamOffers,
} from "../api/campaignApi";
import type { Offer, UpdateStreamOffer } from "../api/campaignApi";
import { mockCampaignEditor } from "../data/mockCampaignEditor";
import { mockOffers } from "../data/mockOffers";
import type { CampaignEditorData } from "../types/campaignEditor";
import type { StreamOffer } from "../types/stream";
import "./CampaignEditor.css";

// Распределяем оставшуюся долю поровну между незакреплёнными активными офферами.
function redistributeUnlockedShares(
  offers: StreamOffer[],
  fixedOfferIds: Set<number>,
): StreamOffer[] {
  const activeOffers = offers.filter((offer) => offer.state === "active");

  const fixedOffers = activeOffers.filter((offer) =>
    fixedOfferIds.has(offer.offer_id),
  );

  const unlockedOffers = activeOffers.filter(
    (offer) => !fixedOfferIds.has(offer.offer_id),
  );

  // Считаем сумму закреплённых процентов.
  const fixedTotal = fixedOffers.reduce((sum, offer) => sum + offer.share, 0);

  // Вычисляем остаток для незакреплённых офферов.
  const remainingShare = 100 - fixedTotal;

  // Если закреплённые проценты превышают 100%, ничего не меняем.
  if (remainingShare < 0) {
    return offers;
  }

  // Если нет незакреплённых офферов, возвращаем исходный список.
  if (unlockedOffers.length === 0) {
    return offers;
  }

  // Делим остаток поровну.
  const baseShare = Math.floor(remainingShare / unlockedOffers.length);

  // Остаток от деления распределяем по одному проценту первым офферам.
  const remainder = remainingShare % unlockedOffers.length;

  const updatedShares = new Map<number, number>();

  unlockedOffers.forEach((offer, index) => {
    updatedShares.set(offer.offer_id, baseShare + (index < remainder ? 1 : 0));
  });

  // Обновляем только незакреплённые активные офферы.
  return offers.map((offer) => {
    if (offer.state !== "active" || fixedOfferIds.has(offer.offer_id)) {
      return offer;
    }

    const share = updatedShares.get(offer.offer_id);

    return share === undefined ? offer : { ...offer, share };
  });
}

export function CampaignEditor() {
  const { id } = useParams<{ id: string }>();

  const [editorData, setEditorData] = useState<CampaignEditorData | null>(null);

  const [savedOffers, setSavedOffers] = useState<StreamOffer[]>([]);
  const [availableOffers, setAvailableOffers] = useState<Offer[]>([]);

  // Фиксация долей хранится на клиенте: API Keitaro принимает только offer_id/share/state.
  const [fixedOfferIds, setFixedOfferIds] = useState<Set<number>>(new Set());
  const [savedFixedOfferIds, setSavedFixedOfferIds] = useState<Set<number>>(
    new Set(),
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isMockEditor, setIsMockEditor] = useState(false);
  const [isMockOfferList, setIsMockOfferList] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Загружаем данные компании и каталог офферов.
  useEffect(() => {
    async function loadEditor() {
      const campaignId = Number(id);

      if (!Number.isInteger(campaignId) || campaignId <= 0) {
        setError("Некорректный ID компании");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      let editorIsMock = false;

      try {
        const data = await getCampaignEditor(campaignId);
        setEditorData(data);
      } catch (requestError) {
        console.error("Ошибка загрузки редактора:", requestError);

        // Для тестовой компании используем локальные данные.
        if (campaignId === mockCampaignEditor.campaign.id) {
          setEditorData(structuredClone(mockCampaignEditor));
          editorIsMock = true;
          setSaveMessage("Используются тестовые данные компании");
        } else {
          setError("Не удалось загрузить данные компании");
          setIsLoading(false);
          return;
        }
      }

      setIsMockEditor(editorIsMock);

      try {
        const offers = await getOffers();
        setAvailableOffers(offers);
        setIsMockOfferList(false);
      } catch (requestError) {
        console.error("Ошибка загрузки каталога офферов:", requestError);
        setAvailableOffers(structuredClone(mockOffers));
        setIsMockOfferList(true);
      }

      setIsLoading(false);
    }

    loadEditor();
  }, [id]);

  // Находим поток, в котором хранятся офферы.
  const offersStream =
    editorData?.streams.find(
      (stream) => stream.schema === "landings" && stream.filters.length === 0,
    ) ??
    editorData?.streams.find(
      (stream) => stream.schema === "redirect" && stream.filters.length === 0,
    );

  const currentOffers = offersStream?.offers ?? [];

  // Сохраняем исходный список офферов и исходные настройки фиксации после загрузки компании.
  useEffect(() => {
    if (offersStream) {
      const initialOffers = structuredClone(offersStream.offers);
      setSavedOffers(initialOffers);
      setFixedOfferIds(new Set());
      setSavedFixedOfferIds(new Set());
    }
  }, [editorData?.campaign.id]);

  const hasChanges = useMemo(
    () =>
      JSON.stringify(currentOffers) !== JSON.stringify(savedOffers) ||
      fixedOfferIds.size !== savedFixedOfferIds.size ||
      [...fixedOfferIds].some((offerId) => !savedFixedOfferIds.has(offerId)),
    [currentOffers, savedOffers, fixedOfferIds, savedFixedOfferIds],
  );

  // Сумма долей только активных офферов.
  const totalShare = currentOffers
    .filter((offer) => offer.state === "active")
    .reduce((total, offer) => total + offer.share, 0);

  const isShareValid = totalShare === 100;

  // Результаты поиска по ID и названию.
  const filteredOffers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return [];

    const addedOfferIds = new Set(currentOffers.map((offer) => offer.offer_id));

    return availableOffers
      .filter((offer) => {
        const matchesQuery =
          String(offer.id).includes(query) ||
          offer.name.toLowerCase().includes(query);

        return matchesQuery && !addedOfferIds.has(offer.id);
      })
      .slice(0, 10);
  }, [availableOffers, currentOffers, searchQuery]);

  // Обновляем список офферов внутри редактора.
  function updateLocalOffers(updatedOffers: StreamOffer[]) {
    if (!offersStream) return;

    setEditorData((previousData) => {
      if (!previousData) return previousData;

      return {
        ...previousData,
        streams: previousData.streams.map((stream) =>
          stream.id === offersStream.id
            ? { ...stream, offers: updatedOffers }
            : stream,
        ),
      };
    });

    setSaveMessage(null);
    setSaveError(null);
  }

  // Добавляем оффер и пересчитываем только незакреплённые доли.
  function handleAddOffer(offer: Offer) {
    if (!offersStream) return;

    const exists = currentOffers.some((item) => item.offer_id === offer.id);

    if (exists) {
      setOfferError("Этот оффер уже добавлен");
      return;
    }

    const newOffer: StreamOffer = {
      id: Math.max(0, ...currentOffers.map((item) => item.id)) + 1,
      stream_id: offersStream.id,
      offer_id: offer.id,
      share: 0,
      state: "active",
    };

    const updatedOffers = redistributeUnlockedShares(
      [...currentOffers, newOffer],
      fixedOfferIds,
    );

    updateLocalOffers(updatedOffers);
    setSearchQuery("");
    setIsSearchOpen(false);
    setOfferError(null);
  }

  // Включаем или выключаем фиксацию текущей доли оффера.
  function handleToggleFixed(offerId: number) {
    const nextFixedIds = new Set(fixedOfferIds);

    if (nextFixedIds.has(offerId)) {
      nextFixedIds.delete(offerId);
    } else {
      nextFixedIds.add(offerId);
    }

    setFixedOfferIds(nextFixedIds);
    setSaveMessage(null);
    setSaveError(null);
  }

  // Отключаем оффер и перераспределяем доли остальных незакреплённых офферов.
  function handleRemoveOffer(offerId: number) {
    const updatedOffers = currentOffers.map((offer) =>
      offer.offer_id === offerId
        ? { ...offer, state: "disabled" as const, share: 0 }
        : offer,
    );

    updateLocalOffers(redistributeUnlockedShares(updatedOffers, fixedOfferIds));
  }

  // Возвращаем отключённый оффер.
  function handleRestoreOffer(offerId: number) {
    const updatedOffers = currentOffers.map((offer) =>
      offer.offer_id === offerId
        ? { ...offer, state: "active" as const, share: 0 }
        : offer,
    );

    updateLocalOffers(redistributeUnlockedShares(updatedOffers, fixedOfferIds));
  }

  // Меняем долю вручную. Для закреплённого оффера это явное изменение пользователем.
  function handleShareChange(offerId: number, value: string) {
    if (value.trim() === "") return;

    const share = Number(value);

    if (!Number.isInteger(share) || share < 0 || share > 100) return;

    const updatedOffers = currentOffers.map((offer) =>
      offer.offer_id === offerId && offer.state === "active"
        ? { ...offer, share }
        : offer,
    );

    updateLocalOffers(updatedOffers);
  }

  // Отменяем изменения, включая изменения фиксации.
  function handleCancelChanges() {
    updateLocalOffers(structuredClone(savedOffers));
    setFixedOfferIds(new Set(savedFixedOfferIds));
    setOfferError(null);
    setSaveError(null);
    setSaveMessage("Изменения отменены");
  }

  // Отправляем весь обновлённый список офферов в Keitaro.
  async function handlePushToKeitaro() {
    if (!offersStream) {
      setSaveError("Поток офферов не найден");
      return;
    }

    if (!isShareValid) {
      setSaveError("Сумма долей активных офферов должна составлять 100%");
      return;
    }

    if (isMockEditor) {
      setSaveError(
        "Нельзя отправить изменения: используются тестовые данные компании",
      );
      return;
    }

    if (isMockOfferList) {
      setSaveError(
        "Нельзя отправить изменения: используется тестовый каталог офферов",
      );
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveMessage(null);

      // Флаг фиксации нужен интерфейсу и не отправляется в Keitaro.
      const offers: UpdateStreamOffer[] = currentOffers.map(
        ({ offer_id, share, state }) => ({
          offer_id,
          share,
          state,
        }),
      );

      await updateStreamOffers(offersStream.id, offers);

      setSavedOffers(structuredClone(currentOffers));
      setSavedFixedOfferIds(new Set(fixedOfferIds));
      setSaveMessage("Изменения успешно отправлены в Keitaro");
    } catch (requestError) {
      console.error("Ошибка отправки офферов:", requestError);
      setSaveError(
        "Не удалось отправить изменения. Проверьте соединение с Backend и Keitaro.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  // Находим данные оффера по ID.
  function getOfferInfo(offerId: number) {
    return availableOffers.find((offer) => offer.id === offerId);
  }

  return (
    <main className="campaign-editor">
      <Link to="/" className="campaign-editor__back">
        ← Вернуться к компаниям
      </Link>

      {isLoading && <p>Загрузка данных компании...</p>}

      {error && (
        <div>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Повторить</button>
        </div>
      )}

      {!isLoading && !error && editorData && (
        <>
          <div className="campaign-editor__header">
            <div>
              <h1>{editorData.campaign.name}</h1>
              <p>Настройки компании и управление офферами</p>
            </div>

            <span className="campaign-editor__id">
              ID: {editorData.campaign.id}
            </span>
          </div>

          <section className="campaign-editor__content">
            <h2>Информация о компании</h2>

            <div className="campaign-editor__details">
              <p>
                <strong>Название:</strong> {editorData.campaign.name}
              </p>
              <p>
                <strong>Статус:</strong>{" "}
                {editorData.campaign.state === "active"
                  ? "Активна"
                  : "Отключена"}
              </p>
              <p>
                <strong>Домен:</strong>{" "}
                {editorData.campaign.domain ?? "Не указан"}
              </p>
              <p>
                <strong>ID группы:</strong> {editorData.campaign.group_id}
              </p>
              <p>
                <strong>ID источника трафика:</strong>{" "}
                {editorData.campaign.traffic_source_id}
              </p>
            </div>
          </section>

          <section className="campaign-editor__content">
            <h2>Потоки компании</h2>

            {editorData.streams.length === 0 && (
              <p>У этой компании пока нет потоков</p>
            )}

            <div className="campaign-editor__streams">
              {editorData.streams.map((stream) => (
                <article className="campaign-editor__stream" key={stream.id}>
                  <h3>{stream.name}</h3>
                  <p>
                    <strong>ID потока:</strong> {stream.id}
                  </p>
                  <p>
                    <strong>Схема:</strong> {stream.schema}
                  </p>
                  <p>
                    <strong>Тип:</strong> {stream.type}
                  </p>

                  {stream.filters.length > 0 && (
                    <div>
                      <strong>Фильтры:</strong>
                      {stream.filters.map((filter, index) => (
                        <p key={filter.id ?? index}>
                          {filter.name}: {filter.payload.join(", ")}
                        </p>
                      ))}
                    </div>
                  )}

                  {stream.id === offersStream?.id && (
                    <div
                      className={
                        hasChanges
                          ? "campaign-editor__offers campaign-editor__offers--dirty"
                          : "campaign-editor__offers"
                      }
                    >
                      <div className="campaign-editor__offers-header">
                        <strong>Офферы</strong>
                        <span
                          className={
                            isShareValid
                              ? "campaign-editor__share-valid"
                              : "campaign-editor__share-invalid"
                          }
                        >
                          Общая доля: {totalShare}%
                        </span>
                      </div>

                      {isMockOfferList && (
                        <p className="campaign-editor__mock-note">
                          Используется тестовый каталог офферов
                        </p>
                      )}

                      {stream.offers.length === 0 && (
                        <p>В этом потоке пока нет офферов</p>
                      )}

                      <div className="campaign-editor__offers-list">
                        {stream.offers.map((offer) => {
                          const offerInfo = getOfferInfo(offer.offer_id);
                          const isActive = offer.state === "active";
                          const isFixed = fixedOfferIds.has(offer.offer_id);

                          return (
                            <div
                              className="campaign-editor__offer"
                              key={offer.id}
                            >
                              <div className="campaign-editor__offer-info">
                                <strong>
                                  {offerInfo?.name ??
                                    `Оффер #${offer.offer_id}`}
                                </strong>
                                <span>ID: {offer.offer_id}</span>

                                {offerInfo?.country &&
                                  offerInfo.country.length > 0 && (
                                    <span>
                                      GEO: {offerInfo.country.join(", ")}
                                    </span>
                                  )}

                                {!isActive && (
                                  <span className="campaign-editor__offer-removed">
                                    Отключён
                                  </span>
                                )}

                                {isActive && isFixed && (
                                  <span className="campaign-editor__fixed-label">
                                    Процент зафиксирован
                                  </span>
                                )}
                              </div>

                              <label className="campaign-editor__offer-share">
                                Доля трафика (%)
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="1"
                                  value={offer.share}
                                  disabled={!isActive}
                                  onChange={(event) =>
                                    handleShareChange(
                                      offer.offer_id,
                                      event.target.value,
                                    )
                                  }
                                />
                              </label>

                              {isActive && (
                                <button
                                  type="button"
                                  className="campaign-editor__fix"
                                  onClick={() =>
                                    handleToggleFixed(offer.offer_id)
                                  }
                                >
                                  {isFixed ? "Снять фиксацию" : "Зафиксировать"}
                                </button>
                              )}

                              {isActive ? (
                                <button
                                  type="button"
                                  className="campaign-editor__remove"
                                  onClick={() =>
                                    handleRemoveOffer(offer.offer_id)
                                  }
                                >
                                  Удалить
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="campaign-editor__restore"
                                  onClick={() =>
                                    handleRestoreOffer(offer.offer_id)
                                  }
                                >
                                  Вернуть
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="campaign-editor__add-offer">
                        <h4>Добавить оффер</h4>

                        <div className="campaign-editor__search">
                          <input
                            type="text"
                            placeholder="Поиск по ID или названию оффера"
                            value={searchQuery}
                            onFocus={() => setIsSearchOpen(true)}
                            onChange={(event) => {
                              setSearchQuery(event.target.value);
                              setIsSearchOpen(true);
                              setOfferError(null);
                            }}
                          />

                          {isSearchOpen && searchQuery.trim() !== "" && (
                            <div className="campaign-editor__search-results">
                              {filteredOffers.length > 0 ? (
                                filteredOffers.map((offer) => (
                                  <button
                                    type="button"
                                    key={offer.id}
                                    className="campaign-editor__search-result"
                                    onClick={() => handleAddOffer(offer)}
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

                        {offerError && <p>{offerError}</p>}
                      </div>

                      {hasChanges && (
                        <div className="campaign-editor__actions">
                          <button
                            type="button"
                            onClick={handlePushToKeitaro}
                            disabled={
                              isSaving ||
                              !isShareValid ||
                              isMockEditor ||
                              isMockOfferList
                            }
                          >
                            {isSaving ? "Отправка..." : "Отправить в KT"}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelChanges}
                            disabled={isSaving}
                          >
                            Отменить
                          </button>
                        </div>
                      )}

                      {!isShareValid && (
                        <p className="campaign-editor__share-error">
                          Сумма долей активных офферов должна составлять 100%
                        </p>
                      )}

                      {saveMessage && <p>{saveMessage}</p>}
                      {saveError && <p>{saveError}</p>}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
