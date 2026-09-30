import { useTranslation } from "react-i18next";

import { useGameStore } from "../store/gameStore";

/**
 * 玩家互动结果的气泡。
 * 显示与隐藏完全由 store 的定时器驱动（见 gameStore 的 FEEDBACK_TTL_MS），
 * 组件这里不做时间轮询 —— 那会让整棵树每秒重渲染数次。
 */
export function SpeechBubble() {
  const { t } = useTranslation();
  const feedback = useGameStore((s) => s.feedback);

  if (!feedback) return null;

  let key: string;
  if (!feedback.ok) {
    key = "actionResult.refused";
  } else if (feedback.backfire) {
    key = "actionResult.backfire";
  } else {
    key = `actionResult.${feedback.action}`;
  }

  return (
    <div className="bubble" key={feedback.at} role="status">
      {t(key)}
    </div>
  );
}
