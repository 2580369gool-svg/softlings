/* ============================================================
   小游戏外壳
   统一负责：计时、计分、HUD、退出、结算。
   各个游戏组件只实现玩法本身，不重复写这些东西。
   ============================================================ */

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { playSfx } from "../audio";
import { useGameStore } from "../store/gameStore";
import { SoundToggle } from "../ui/SoundToggle";

import { GAME_COMPONENTS } from "./registry";
import { GAMES, type GameId } from "./types";
import "./minigames.css";

/** HUD 刷新频率。分数是离散变化的，不需要跟着渲染循环跑。 */
const HUD_INTERVAL_MS = 100;

interface Props {
  gameId: GameId;
}

export function MiniGameStage({ gameId }: Props) {
  const { t } = useTranslation();
  const finishGame = useGameStore((s) => s.finishGame);
  const openScreen = useGameStore((s) => s.openScreen);

  const def = GAMES[gameId];
  const Game = GAME_COMPONENTS[gameId];

  const [score, setScore] = useState(0);
  const [remainingMs, setRemainingMs] = useState(def.durationMs);

  // 用 ref 记录结束时刻，避免每次 tick 都依赖 state 造成闭包陈旧。
  // 初值给 0 而不是 Date.now()：render 期间调用 Date.now() 是不纯的，
  // 真正的值在下面的挂载 effect 里设置。
  const endAtRef = useRef(0);
  const finishedRef = useRef(false);
  const scoreRef = useRef(0);
  const lastCountdownRef = useRef(-1);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    finishGame(scoreRef.current);
  }, [finishGame]);

  const addScore = useCallback((delta: number) => {
    scoreRef.current = Math.max(0, scoreRef.current + delta);
    setScore(scoreRef.current);
  }, []);

  // 倒计时。用 setTimeout + 自校正而不是 setInterval：
  // 浏览器在后台会节流定时器，自校正能保证总时长准确。
  useEffect(() => {
    endAtRef.current = Date.now() + def.durationMs;
    const timer = window.setInterval(() => {
      const left = endAtRef.current - Date.now();
      setRemainingMs(Math.max(0, left));

      // 最后 5 秒每秒滴一下。用「秒数变化」而不是计时器次数来判断，
      // 否则浏览器节流定时器时会漏响或连响。
      if (left > 0 && left <= 5_000) {
        const sec = Math.ceil(left / 1000);
        if (sec !== lastCountdownRef.current) {
          lastCountdownRef.current = sec;
          playSfx("countdown");
        }
      }

      if (left <= 0) finish();
    }, HUD_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [def.durationMs, finish]);

  // 切到后台就放弃这一局 —— 否则回来时时间已经跑完，白拿保底奖励
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) openScreen("arcade");
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [openScreen]);

  const progress = Math.max(0, remainingMs / def.durationMs);

  return (
    <div className="mg">
      <header className="mg__hud">
        <button
          type="button"
          className="mg__quit"
          onClick={() => openScreen("arcade")}
          aria-label={t("arcade.quit")}
        >
          ✕
        </button>

        <div className="mg__title">{t(`game.${gameId}.name`)}</div>

        <div className="mg__score">
          <span className="mg__scoreNum">{score}</span>
          <span className="mg__scoreUnit">{t("arcade.points")}</span>
        </div>

        {/* 小游戏 HUD 里也要能静音：音乐一直在放，玩家不该被迫退回主界面关它 */}
        <SoundToggle />
      </header>

      {/* 时间条：只剩最后 5 秒时变红，给一个明确的时间压力信号 */}
      <div className="mg__timerTrack">
        <div
          className={`mg__timerFill${remainingMs < 5_000 ? " is-urgent" : ""}`}
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      <div className="mg__stage">
        <Game
          onScore={addScore}
          score={score}
          onEarlyFinish={finish}
          onQuit={() => openScreen("arcade")}
        />
      </div>
    </div>
  );
}
