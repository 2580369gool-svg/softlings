import { useTranslation } from "react-i18next";

import { ACTIONS } from "../core/balance";
import { ACTION_KEYS, type ActionKey } from "../core/types";
import { useNow } from "../hooks/useNow";
import { useGameStore } from "../store/gameStore";

/** 用 emoji 当图标：零素材、跨平台、天然可爱 */
const ICON: Record<ActionKey, string> = {
  feed: "🍖",
  bathe: "🛁",
  pet: "🫶",
  play: "🎾",
  tease: "🪶",
  photo: "📷",
  talk: "💬",
  sleep: "😴",
};

export function ActionBar() {
  const { t } = useTranslation();
  const sim = useGameStore((s) => s.sim);
  const cooldowns = useGameStore((s) => s.cooldowns);
  const perform = useGameStore((s) => s.perform);
  const now = useNow(200);

  if (!sim) return null;

  const { needs, sleeping } = sim.pet;

  return (
    <nav className="actions" aria-label="actions">
      {ACTION_KEYS.map((key) => {
        const def = ACTIONS[key];
        const readyAt = cooldowns[key] ?? 0;
        const remain = Math.max(0, readyAt - now);
        const cooling = remain > 0;
        const noEnergy =
          def.requiresEnergy !== undefined && needs.energy < def.requiresEnergy;
        const blocked = cooling || noEnergy || (sleeping && key !== "sleep");

        return (
          <button
            key={key}
            type="button"
            className={`action${blocked ? " is-blocked" : ""}`}
            // 用 aria-disabled 而不是 disabled：被拒绝时也要能触发反馈气泡
            aria-disabled={blocked}
            onClick={() => perform(key)}
          >
            <span className="action__icon" aria-hidden="true">
              {ICON[key]}
            </span>
            <span className="action__label">{t(`actions.${key}`)}</span>

            {cooling && (
              <span
                className="action__cool"
                style={{ transform: `scaleY(${remain / def.cooldownMs})` }}
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
