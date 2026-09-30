import { useState } from "react";
import { useTranslation } from "react-i18next";

import { inventoryCount, ITEMS, ITEM_IDS, type ItemId } from "../core/items";
import { useGameStore } from "../store/gameStore";

import { BackButton } from "./BackButton";
import { LanguageToggle } from "./LanguageToggle";

const ITEM_ICON: Record<ItemId, string> = {
  snack: "🍪",
  dessert: "🍰",
  bubbleBath: "🛁",
  toyBall: "🎾",
};

/** 商店 —— 小游戏赚的币在这里变成能用的道具 */
export function Shop() {
  const { t } = useTranslation();
  const sim = useGameStore((s) => s.sim);
  const buyItem = useGameStore((s) => s.buyItem);
  const openScreen = useGameStore((s) => s.openScreen);

  const [shake, setShake] = useState<{ id: ItemId; key: number } | null>(null);

  if (!sim) return null;

  const coins = sim.economy.coins;

  return (
    <div className="panel">
      <header className="panel__head">
        <BackButton onBack={() => openScreen("main")} />
        <h1 className="panel__title">{t("shop.title")}</h1>
        <LanguageToggle />
      </header>

      <div className="arcade__wallet">
        <span className="arcade__coins">🪙 {Math.floor(coins)}</span>
      </div>

      <ul className="shop__list">
        {ITEM_IDS.map((id) => {
          const def = ITEMS[id];
          const owned = inventoryCount(sim.economy.items, id);
          const affordable = coins >= def.price;

          return (
            <li key={id} className="shop__row">
              <span className="shop__icon" aria-hidden="true">
                {ITEM_ICON[id]}
              </span>

              <span className="shop__text">
                <strong className="shop__name">
                  {t(`item.${id}.name`)}
                  {owned > 0 && <span className="shop__owned">×{owned}</span>}
                </strong>
                <span className="shop__desc">{t(`item.${id}.desc`)}</span>
              </span>

              <button
                type="button"
                className={`shop__buy${affordable ? "" : " is-poor"}${
                  shake?.id === id ? " is-shaking" : ""
                }`}
                key={shake?.id === id ? shake.key : id}
                onClick={() => {
                  if (!buyItem(id)) {
                    // 买不起时抖一下，比弹提示更轻，也不打断操作
                    setShake({ id, key: Date.now() });
                  }
                }}
              >
                🪙 {def.price}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="shop__footnote">{t("shop.footnote")}</p>
    </div>
  );
}
