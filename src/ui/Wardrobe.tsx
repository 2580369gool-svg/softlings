import { useTranslation } from "react-i18next";

import type { Species } from "../core/types";
import { ACCESSORIES, accessoriesInSlot, SLOTS, type AccessoryId } from "../core/wardrobe";
import { ACCESSORY_ART, ANCHORS } from "../render/accessories";
import { PetSvg } from "../render/PetSvg";
import { useGameStore } from "../store/gameStore";

import { BackButton } from "./BackButton";
import { LanguageToggle } from "./LanguageToggle";

/** 单件饰品的缩略图：把它的锚点平移到画面中心，这样每件都居中显示 */
function AccessoryThumb({ id, species }: { id: AccessoryId; species: Species }) {
  const anchors = ANCHORS[species];
  const p = anchors[ACCESSORIES[id].slot];

  return (
    <svg viewBox="0 0 200 200" className="acc__svg" aria-hidden="true">
      <g transform={`translate(${100 - p.x} ${100 - p.y})`}>
        {ACCESSORY_ART[id](anchors)}
      </g>
    </svg>
  );
}

export function Wardrobe() {
  const { t } = useTranslation();
  const sim = useGameStore((s) => s.sim);
  const buyAccessory = useGameStore((s) => s.buyAccessory);
  const equipAccessory = useGameStore((s) => s.equipAccessory);
  const openScreen = useGameStore((s) => s.openScreen);

  if (!sim) return null;

  const { pet, economy, collection } = sim;

  return (
    <div className="panel">
      <header className="panel__head">
        <BackButton onBack={() => openScreen("main")} />
        <h1 className="panel__title">{t("wardrobe.title")}</h1>
        <LanguageToggle />
      </header>

      <div className="arcade__wallet">
        <span className="arcade__coins">🪙 {Math.floor(economy.coins)}</span>
        <span className="arcade__quota">{t("wardrobe.hint")}</span>
      </div>

      {/* 试穿预览 —— 这是「买它」的决策依据，不能省 */}
      <div className="wardrobe__preview">
        <PetSvg
          species={pet.species}
          stage={pet.stage}
          evolution={pet.evolution}
          accessories={pet.accessories}
          status="happy"
        />
      </div>

      {SLOTS.map((slot) => (
        <section key={slot} className="wardrobe__section">
          <h2 className="wardrobe__slot">{t(`slot.${slot}`)}</h2>
          <ul className="wardrobe__row">
            {accessoriesInSlot(slot).map((acc) => {
              const owned = collection.accessories.includes(acc.id);
              const worn = pet.accessories[slot] === acc.id;
              const affordable = economy.coins >= acc.price;

              return (
                <li key={acc.id}>
                  <button
                    type="button"
                    className={`acc${worn ? " is-worn" : ""}${owned ? "" : " is-locked"}${
                      !owned && !affordable ? " is-poor" : ""
                    }`}
                    onClick={() => (owned ? equipAccessory(acc.id) : buyAccessory(acc.id))}
                    aria-label={t(`accessory.${acc.id}`)}
                  >
                    <span className="acc__art">
                      <AccessoryThumb id={acc.id} species={pet.species} />
                    </span>
                    <span className="acc__name">{t(`accessory.${acc.id}`)}</span>
                    <span className="acc__meta">
                      {worn
                        ? t("wardrobe.worn")
                        : owned
                          ? t("wardrobe.tapToWear")
                          : `🪙 ${acc.price}`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <p className="shop__footnote">{t("wardrobe.footnote")}</p>
    </div>
  );
}
