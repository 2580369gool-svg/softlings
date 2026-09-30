import { useTranslation } from "react-i18next";

import type { NeedKey, OfflineReport } from "../core/types";
import { NEED_KEYS } from "../core/types";
import { humanizeDuration } from "../utils/format";

interface Props {
  report: OfflineReport;
  onClose: () => void;
}

/** 「欢迎回来」弹窗 —— 让离线补算对玩家可见、可信 */
export function OfflineModal({ report, onClose }: Props) {
  const { t } = useTranslation();

  const duration = humanizeDuration(report.elapsedMs, {
    day: t("units.day"),
    hour: t("units.hour"),
    minute: t("units.minute"),
    second: t("units.second"),
  });

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="offline-title">
      <div className="modal__card">
        <h2 className="modal__title" id="offline-title">
          {t("offline.title")}
        </h2>
        <p className="modal__body">{t("offline.body", { duration })}</p>
        {report.capped && <p className="modal__note">{t("offline.capped")}</p>}

        <ul className="modal__deltas">
          {NEED_KEYS.map((key: NeedKey) => {
            const delta = report.after[key] - report.before[key];
            if (Math.abs(delta) < 0.5) return null;
            const down = delta < 0;
            return (
              <li key={key} className={`delta delta--${key}`}>
                <span className="delta__name">{t(`needs.${key}`)}</span>
                <span className={`delta__val${down ? " is-down" : " is-up"}`}>
                  {down ? "▼" : "▲"} {Math.abs(Math.round(delta))}
                </span>
              </li>
            );
          })}
        </ul>

        <button type="button" className="btn btn--primary" onClick={onClose}>
          {t("offline.confirm")}
        </button>
      </div>
    </div>
  );
}
