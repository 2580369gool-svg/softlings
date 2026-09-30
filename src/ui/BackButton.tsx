import { useTranslation } from "react-i18next";

import { playSfx } from "../audio";

/**
 * 各面板共用的返回按钮。
 * 存在的意义不只是复用样式 —— 它保证了「点返回」这个动作在四个面板里
 * 都有同样的点击音，不会出现有的面板有声有的没声。
 */
export function BackButton({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className="panel__back"
      onClick={() => {
        playSfx("tap");
        onBack();
      }}
      aria-label={t("common.back")}
    >
      ←
    </button>
  );
}
