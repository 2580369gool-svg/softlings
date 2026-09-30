import { useState } from "react";
import { useTranslation } from "react-i18next";

import { PLACEMENTS, PLACEMENT_IDS, VISITORS, VISITOR_IDS, type PlacementId } from "../core/habitat";
import { humanizeDuration } from "../utils/format";
import { PLACEMENT_ART } from "../render/placementArt";
import { VISITOR_ART } from "../render/visitorArt";
import { useGameStore } from "../store/gameStore";

import { BackButton } from "./BackButton";
import { LanguageToggle } from "./LanguageToggle";

/**
 * 家园 —— 摆东西、等访客、拍照收集。
 *
 * 交互设计：先点一个格子选中，再点下方的摆件放进去。
 * 直接「点摆件就自动填入空格子」在格子满了之后语义会变得含糊
 * （是替换哪一个？），显式选中没有歧义。
 */
export function Habitat() {
  const { t } = useTranslation();
  const sim = useGameStore((s) => s.sim);
  const buyPlacement = useGameStore((s) => s.buyPlacement);
  const setSlot = useGameStore((s) => s.setSlot);
  const photograph = useGameStore((s) => s.photographVisitor);
  const openScreen = useGameStore((s) => s.openScreen);

  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  if (!sim) return null;

  const { habitat, economy, collection } = sim;
  const visitor = habitat.visitor;
  const visitorDef = visitor ? VISITORS[visitor.id] : null;

  const pick = (id: PlacementId) => {
    // 没选格子就自动填第一个空位，这样只买了一件时也能一步放好
    const target = activeSlot ?? habitat.placed.findIndex((p) => p === null);
    if (target < 0) return;
    setSlot(target, id);
    setActiveSlot(null);
  };

  return (
    <div className="panel">
      <header className="panel__head">
        <BackButton onBack={() => openScreen("main")} />
        <h1 className="panel__title">{t("habitat.title")}</h1>
        <LanguageToggle />
      </header>

      <div className="arcade__wallet">
        <span className="arcade__coins">🪙 {Math.floor(economy.coins)}</span>
        <span className="arcade__quota">
          {t("habitat.collected", { n: collection.visitors.length, total: VISITOR_IDS.length })}
        </span>
      </div>

      {/* ---------------- 院子 ---------------- */}
      <div className="yard">
        <div className="yard__sun" aria-hidden="true" />
        <div className="yard__cloud yard__cloud--a" aria-hidden="true" />
        <div className="yard__cloud yard__cloud--b" aria-hidden="true" />

        <div className="yard__slots">
          {habitat.placed.map((id, i) => (
            <button
              key={i}
              type="button"
              className={`yard__slot${activeSlot === i ? " is-active" : ""}`}
              onClick={() => setActiveSlot(activeSlot === i ? null : i)}
              aria-label={id ? t(`placement.${id}`) : t("habitat.emptySlot")}
            >
              {id ? (
                <svg viewBox="0 0 100 100" className="yard__item">
                  {PLACEMENT_ART[id]}
                </svg>
              ) : (
                <span className="yard__plus">＋</span>
              )}
            </button>
          ))}
        </div>

        {visitor && (
          <div className="yard__visitor" key={visitor.id}>
            <svg viewBox="0 0 100 100" className="yard__visitorArt">
              {VISITOR_ART[visitor.id]}
            </svg>
          </div>
        )}
      </div>

      {/* ---------------- 访客 ---------------- */}
      {visitor && visitorDef ? (
        <div className={`visitor${visitor.photographed ? " is-shot" : ""}`}>
          <span className="visitor__name">{t(`visitor.${visitor.id}`)}</span>
          <span className="visitor__stay">
            {t("habitat.staysFor", {
              d: humanizeDuration(visitor.remainingMs, {
                day: t("units.day"),
                hour: t("units.hour"),
                minute: t("units.minute"),
                second: t("units.second"),
              }),
            })}
          </span>

          {visitor.photographed ? (
            <span className="visitor__done">{t("habitat.photographed")}</span>
          ) : (
            <button type="button" className="btn btn--primary" onClick={photograph}>
              📷 {t("habitat.photograph")}
            </button>
          )}
        </div>
      ) : (
        <p className="habitat__waiting">{t("habitat.waiting")}</p>
      )}

      {/* ---------------- 摆件 ---------------- */}
      <section className="habitat__section">
        <h2 className="wardrobe__slot">{t("habitat.placements")}</h2>
        <ul className="wardrobe__row">
          {PLACEMENT_IDS.map((id) => {
            const owned = collection.placements.includes(id);
            const affordable = economy.coins >= PLACEMENTS[id].price;
            const inUse = habitat.placed.includes(id);

            return (
              <li key={id}>
                <button
                  type="button"
                  className={`acc${inUse ? " is-worn" : ""}${owned ? "" : " is-locked"}${
                    !owned && !affordable ? " is-poor" : ""
                  }`}
                  onClick={() => (owned ? pick(id) : buyPlacement(id))}
                  aria-label={t(`placement.${id}`)}
                >
                  <span className="acc__art">
                    <svg viewBox="0 0 100 100" className="acc__svg">
                      {PLACEMENT_ART[id]}
                    </svg>
                  </span>
                  <span className="acc__name">{t(`placement.${id}`)}</span>
                  <span className="acc__meta">
                    {owned ? t("habitat.tapToPlace") : `🪙 ${PLACEMENTS[id].price}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---------------- 访客图鉴 ---------------- */}
      <section className="habitat__section">
        <h2 className="wardrobe__slot">
          {t("habitat.gallery")} · {collection.visitors.length}/{VISITOR_IDS.length}
        </h2>
        <ul className="dexGrid">
          {VISITOR_IDS.map((id) => {
            const seen = collection.visitors.includes(id);
            return (
              <li key={id} className={`dexCell${seen ? "" : " is-unknown"}`}>
                {seen ? (
                  <>
                    <svg viewBox="0 0 100 100" className="dexCell__art">
                      {VISITOR_ART[id]}
                    </svg>
                    <span className="dexCell__name">{t(`visitor.${id}`)}</span>
                  </>
                ) : (
                  <span className="dexCell__unknown">?</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <p className="shop__footnote">{t("habitat.footnote")}</p>
    </div>
  );
}
