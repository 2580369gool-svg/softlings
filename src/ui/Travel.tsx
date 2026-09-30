import { useTranslation } from "react-i18next";

import {
  BENTOS,
  BENTO_IDS,
  departBlockers,
  POSTCARDS,
  POSTCARD_IDS,
  type BentoId,
} from "../core/travel";
import { PostcardArt } from "../render/postcardArt";
import { useGameStore } from "../store/gameStore";
import { humanizeDuration } from "../utils/format";

import { BackButton } from "./BackButton";
import { LanguageToggle } from "./LanguageToggle";

/** 稀有度 → 底色，用来在卡片上标注带回来的照片有多难得 */
const RARITY_KEY = {
  common: "common",
  rare: "rare",
  legendary: "legendary",
} as const;

export function Travel() {
  const { t } = useTranslation();
  const sim = useGameStore((s) => s.sim);
  const startTrip = useGameStore((s) => s.startTrip);
  const openScreen = useGameStore((s) => s.openScreen);

  if (!sim) return null;

  const { travel, economy, pet } = sim;
  const trip = travel.active;
  const blockers = departBlockers(pet);
  const collected = travel.postcards;

  const duration = (ms: number) =>
    humanizeDuration(ms, {
      day: t("units.day"),
      hour: t("units.hour"),
      minute: t("units.minute"),
      second: t("units.second"),
    });

  return (
    <div className="panel">
      <header className="panel__head">
        <BackButton onBack={() => openScreen("main")} />
        <h1 className="panel__title">{t("travel.title")}</h1>
        <LanguageToggle />
      </header>

      <div className="arcade__wallet">
        <span className="arcade__coins">🪙 {Math.floor(economy.coins)}</span>
        <span className="arcade__quota">
          {t("travel.collected", { n: collected.length, total: POSTCARD_IDS.length })}
        </span>
      </div>

      {/* ---------------- 在路上 ---------------- */}
      {trip ? (
        <div className="trip">
          <div className="trip__scene">
            <span className="trip__pet">🎒</span>
            <span className="trip__road" aria-hidden="true" />
          </div>
          <p className="trip__title">{t("travel.onTheWay")}</p>
          <p className="trip__eta">
            {t("travel.backIn", { d: duration(trip.remainingMs) })}
          </p>
          <div className="trip__bar">
            <div
              className="trip__fill"
              style={{
                transform: `scaleX(${Math.max(0, Math.min(1, 1 - trip.remainingMs / trip.totalMs))})`,
              }}
            />
          </div>
          <p className="shop__footnote">{t("travel.offlineNote")}</p>
        </div>
      ) : (
        <>
          {/* ---------------- 准备行囊 ---------------- */}
          <section className="habitat__section">
            <h2 className="wardrobe__slot">{t("travel.pickBento")}</h2>

            {blockers.length > 0 && (
              <p className="trip__blocked">
                {t("travel.notReady", {
                  needs: blockers.map((k) => t(`needs.${k}`)).join(" · "),
                })}
              </p>
            )}

            <ul className="bentoList">
              {BENTO_IDS.map((id: BentoId) => {
                const def = BENTOS[id];
                const affordable = economy.coins >= def.price;
                const ready = blockers.length === 0 && affordable;

                return (
                  <li key={id}>
                    <button
                      type="button"
                      className={`bento${ready ? "" : " is-disabled"}`}
                      onClick={() => startTrip(id)}
                      aria-label={t(`bento.${id}.name`)}
                    >
                      <span className="bento__text">
                        <strong className="bento__name">{t(`bento.${id}.name`)}</strong>
                        <span className="bento__desc">{t(`bento.${id}.desc`)}</span>
                        <span className="bento__meta">
                          {duration(def.durationMs)} ·{" "}
                          {t("travel.odds", {
                            rare: Math.round((def.weights.rare + def.weights.legendary) * 100),
                          })}
                        </span>
                      </span>
                      <span className={`bento__price${affordable ? "" : " is-poor"}`}>
                        🪙 {def.price}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      {/* ---------------- 明信片图鉴 ---------------- */}
      <section className="habitat__section">
        <h2 className="wardrobe__slot">
          {t("travel.gallery")} · {collected.length}/{POSTCARD_IDS.length}
        </h2>
        <ul className="postcardGrid">
          {POSTCARD_IDS.map((id) => {
            const owned = collected.includes(id);
            const def = POSTCARDS[id];
            return (
              <li key={id} className={`postcard${owned ? "" : " is-unknown"}`}>
                {owned ? (
                  <>
                    <svg viewBox="0 0 120 84" className="postcard__art">
                      <PostcardArt id={id} />
                    </svg>
                    <span className="postcard__name">{t(`postcard.${id}`)}</span>
                    <span className={`postcard__rarity is-${RARITY_KEY[def.rarity]}`}>
                      {t(`rarity.${def.rarity}`)}
                    </span>
                  </>
                ) : (
                  <span className="postcard__unknown">?</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <p className="shop__footnote">{t("travel.footnote")}</p>
    </div>
  );
}
