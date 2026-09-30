import { useTranslation } from "react-i18next";

import { DAILY_GAME_COIN_CAP, todayKey } from "../core/items";
import { GAME_COMPONENTS, GAME_ICON } from "../minigames/registry";
import { GAMES, GAME_IDS, SPECIES_BONUS } from "../minigames/types";
import { useGameStore } from "../store/gameStore";

import { BackButton } from "./BackButton";
import { LanguageToggle } from "./LanguageToggle";

/** 小游戏街机厅 —— 选游戏、看今天的收益额度 */
export function ArcadeMenu() {
  const { t } = useTranslation();
  const sim = useGameStore((s) => s.sim);
  const startGame = useGameStore((s) => s.startGame);
  const openScreen = useGameStore((s) => s.openScreen);

  if (!sim) return null;

  const species = sim.pet.species;
  const today = todayKey();
  const earnedToday =
    sim.economy.gameCoinDay === today ? sim.economy.gameCoinsToday : 0;
  const remaining = Math.max(0, DAILY_GAME_COIN_CAP - earnedToday);
  const capReached = remaining <= 0;

  return (
    <div className="panel">
      <header className="panel__head">
        <BackButton onBack={() => openScreen("main")} />
        <h1 className="panel__title">{t("arcade.title")}</h1>
        <LanguageToggle />
      </header>

      <div className="arcade__wallet">
        <span className="arcade__coins">🪙 {Math.floor(sim.economy.coins)}</span>
        <span className={`arcade__quota${capReached ? " is-empty" : ""}`}>
          {capReached
            ? t("arcade.capReached")
            : t("arcade.quota", { n: remaining })}
        </span>
      </div>

      <ul className="arcade__list">
        {GAME_IDS.map((id) => {
          const def = GAMES[id];
          const favored = def.favoredBy === species;
          // 未注册组件的游戏不该出现在菜单里，否则点了会白屏
          if (!GAME_COMPONENTS[id]) return null;

          return (
            <li key={id}>
              <button
                type="button"
                className="game-card"
                onClick={() => startGame(id)}
                aria-label={t(`game.${id}.name`)}
              >
                <span className="game-card__icon" aria-hidden="true">
                  {GAME_ICON[id]}
                </span>
                <span className="game-card__text">
                  <strong className="game-card__name">{t(`game.${id}.name`)}</strong>
                  <span className="game-card__desc">{t(`game.${id}.desc`)}</span>
                </span>
                {favored && (
                  <span className="game-card__bonus" title={t("arcade.bonusHint")}>
                    ★
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="arcade__footnote">
        {t("arcade.bonusNote", { mult: SPECIES_BONUS })}
      </p>
    </div>
  );
}
