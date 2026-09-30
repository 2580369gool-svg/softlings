import { useTranslation } from "react-i18next";

import { STATUS_THRESHOLDS } from "../core/balance";
import type { NeedKey } from "../core/types";

interface NeedBarProps {
  need: NeedKey;
  value: number;
}

/**
 * 单条需求条。
 * 填充用 transform: scaleX 而非 width —— 走 GPU 合成层，低端安卓机不卡。
 */
export function NeedBar({ need, value }: NeedBarProps) {
  const { t } = useTranslation();
  const pct = Math.max(0, Math.min(100, value));
  const low = pct < STATUS_THRESHOLDS.low;

  return (
    <div className={`need need--${need}${low ? " is-low" : ""}`}>
      <span className="need__label">{t(`needs.${need}`)}</span>
      <div
        className="need__track"
        role="progressbar"
        aria-label={t(`needs.${need}`)}
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="need__fill" style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
      <span className="need__value">{Math.round(pct)}</span>
    </div>
  );
}
