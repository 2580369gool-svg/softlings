import { useTranslation } from "react-i18next";

import { BEHAVIORS } from "../core/behavior";
import { useGameStore } from "../store/gameStore";

/**
 * 宠物自主行为的气泡。
 *
 * 优先让位给玩家的互动反馈 —— 玩家刚点完按钮，屏幕上应该是他操作的结果，
 * 而不是宠物自己在嘀咕。（store 的 perform 会直接清空 behavior，所以
 * 这里通常不会真的撞上，判断保留作为兜底。）
 *
 * 显示时长同样由 store 驱动，不做时间轮询。
 */
export function BehaviorBubble() {
  const { t } = useTranslation();
  const behavior = useGameStore((s) => s.behavior);
  const feedback = useGameStore((s) => s.feedback);

  if (!behavior || feedback) return null;

  const def = BEHAVIORS[behavior.id];
  if (!def?.bubble) return null;

  return (
    <div className="bubble bubble--soft" key={behavior.key} role="status">
      {t(`behavior.${behavior.id}`)}
    </div>
  );
}
