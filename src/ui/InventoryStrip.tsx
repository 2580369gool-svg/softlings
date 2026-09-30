import { useTranslation } from "react-i18next";

import { inventoryCount, ITEM_IDS, type ItemId } from "../core/items";
import { useGameStore } from "../store/gameStore";

const ITEM_ICON: Record<ItemId, string> = {
  snack: "🍪",
  dessert: "🍰",
  bubbleBath: "🛁",
  toyBall: "🎾",
};

/**
 * 背包条。
 * 只在真有道具时才出现 —— 空的时候占着一行高度，
 * 会让本来就不宽裕的竖屏空间更紧张。
 */
export function InventoryStrip() {
  const { t } = useTranslation();
  const sim = useGameStore((s) => s.sim);
  // 别把它命名成 useItem —— 以 use 开头的变量会被 lint 当成 Hook，
  // 然后在回调里调用就会报「Hook 不能在回调中调用」的假错误
  const applyItem = useGameStore((s) => s.useItem);

  if (!sim) return null;

  const owned = ITEM_IDS.filter((id) => inventoryCount(sim.economy.items, id) > 0);
  if (owned.length === 0) return null;

  return (
    <div className="inventory" aria-label={t("ui.items")}>
      {owned.map((id) => (
        <button
          key={id}
          type="button"
          className="inventory__item"
          onPointerDown={() => applyItem(id)}
          aria-label={t("ui.useItem", { name: t(`item.${id}.name`) })}
        >
          <span className="inventory__icon" aria-hidden="true">
            {ITEM_ICON[id]}
          </span>
          <span className="inventory__count">{inventoryCount(sim.economy.items, id)}</span>
        </button>
      ))}
    </div>
  );
}
