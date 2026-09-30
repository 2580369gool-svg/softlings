import { useTranslation } from "react-i18next";

import { GAME_ICON } from "../minigames/registry";
import { useGameStore } from "../store/gameStore";

/** 小游戏结算界面 —— 把「玩得怎么样」和「赚到多少」一次说清楚 */
export function GameResult() {
  const { t } = useTranslation();
  const result = useGameStore((s) => s.lastGameResult);
  const dismiss = useGameStore((s) => s.dismissGameResult);
  const startGame = useGameStore((s) => s.startGame);

  if (!result) return null;

  return (
    <div className="result">
      <div className="result__card">
        <span className="result__icon" aria-hidden="true">
          {GAME_ICON[result.gameId]}
        </span>
        <h1 className="result__title">{t("arcade.resultTitle")}</h1>

        <dl className="result__stats">
          <div className="result__stat">
            <dt>{t("arcade.yourScore")}</dt>
            <dd>{result.score}</dd>
          </div>
          <div className="result__stat result__stat--coins">
            <dt>{t("arcade.earned")}</dt>
            <dd>🪙 {result.coins}</dd>
          </div>
        </dl>

        {result.bonus && (
          <p className="result__bonus">{t("arcade.bonusEarned")}</p>
        )}
        {result.capped && <p className="result__capped">{t("arcade.capped")}</p>}

        <div className="result__actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => startGame(result.gameId)}
          >
            {t("arcade.again")}
          </button>
          <button type="button" className="btn btn--ghost" onClick={dismiss}>
            {t("arcade.backToArcade")}
          </button>
        </div>
      </div>
    </div>
  );
}
