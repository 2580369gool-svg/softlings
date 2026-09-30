/* ============================================================
   打地鼠
   3×3 格子里随机冒头，点中得分；混在其中的炸弹点错扣分。

   机制上和已有的六个都不同：考的是**反应速度**。
   难度靠三件事一起加：冒头时间变短、同时出现变多、炸弹比例变高。
   ============================================================ */

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { playSfx } from "../audio";

import type { GameProps } from "./types";

const CELLS = 9;
/** 冒头停留时长，从宽到严 */
const UP_START_MS = 1_150;
const UP_MIN_MS = 560;
/** 两次冒头之间的间隔 */
const GAP_START_MS = 620;
const GAP_MIN_MS = 200;
/** 炸弹比例 */
const BOMB_START = 0.12;
const BOMB_MAX = 0.32;
/** 同时最多冒出几个 */
const MAX_ACTIVE_START = 1;
const MAX_ACTIVE_END = 3;
/** 难度爬满所需时长 */
const RAMP_MS = 20_000;
/** 点中 / 点错的分值 */
const HIT_SCORE = 2;
const BOMB_PENALTY = -3;

interface Mole {
  cell: number;
  bomb: boolean;
  /** 到点自动缩回去 */
  until: number;
}

export function WhackMole({ onScore }: GameProps) {
  const { t } = useTranslation();
  const [moles, setMoles] = useState<Mole[]>([]);

  const startedAt = useRef(0);
  const seq = useRef(0);
  const timers = useRef<number[]>([]);

  const ramped = useCallback(() => {
    const elapsed = Date.now() - startedAt.current;
    return Math.min(1, Math.max(0, elapsed / RAMP_MS));
  }, []);

  /* ---------------- 冒头调度 ---------------- */

  useEffect(() => {
    startedAt.current = Date.now();
    let cancelled = false;

    const spawn = () => {
      if (cancelled) return;
      const ramp = ramped();

      setMoles((prev) => {
        const busy = new Set(prev.map((m) => m.cell));
        const free: number[] = [];
        for (let i = 0; i < CELLS; i++) if (!busy.has(i)) free.push(i);

        const maxActive = Math.round(
          MAX_ACTIVE_START + (MAX_ACTIVE_END - MAX_ACTIVE_START) * ramp,
        );
        if (free.length === 0 || prev.length >= maxActive) return prev;

        const cell = free[Math.floor(Math.random() * free.length)];
        if (cell === undefined) return prev;

        const upMs = UP_START_MS - (UP_START_MS - UP_MIN_MS) * ramp;
        const bombChance = BOMB_START + (BOMB_MAX - BOMB_START) * ramp;

        return [
          ...prev,
          {
            cell,
            bomb: Math.random() < bombChance,
            until: Date.now() + upMs,
          },
        ];
      });

      const gap = GAP_START_MS - (GAP_START_MS - GAP_MIN_MS) * ramp;
      const id = window.setTimeout(spawn, gap * (0.7 + Math.random() * 0.6));
      timers.current.push(id);
    };

    const first = window.setTimeout(spawn, 400);
    timers.current.push(first);

    return () => {
      cancelled = true;
      for (const id of timers.current) window.clearTimeout(id);
      timers.current = [];
    };
  }, [ramped]);

  /* 到点自动缩回去 */
  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      setMoles((prev) => (prev.some((m) => m.until <= now) ? prev.filter((m) => m.until > now) : prev));
    }, 80);
    return () => window.clearInterval(timer);
  }, []);

  /* ---------------- 点击 ---------------- */

  const whack = useCallback(
    (cell: number) => {
      const now = Date.now();
      const target = moles.find((m) => m.cell === cell && m.until > now);
      if (!target) {
        // 点空不扣分，只给一个轻反馈，避免玩家不敢点
        playSfx("miss");
        return;
      }

      setMoles((prev) => prev.filter((m) => m !== target));

      if (target.bomb) {
        playSfx("badPop");
        onScore(BOMB_PENALTY);
      } else {
        playSfx("catch");
        onScore(HIT_SCORE);
      }
      seq.current += 1;
    },
    [moles, onScore],
  );

  return (
    <div className="whack">
      <p className="whack__hint">{t("whack.hint")}</p>
      <div className="whack__grid">
        {Array.from({ length: CELLS }, (_, cell) => {
          const mole = moles.find((m) => m.cell === cell);
          return (
            <button
              key={cell}
              type="button"
              className="whack__cell"
              onPointerDown={() => whack(cell)}
              aria-label={mole ? (mole.bomb ? t("whack.bomb") : t("whack.mole")) : t("whack.empty")}
            >
              {mole && (
                <span className={`whack__mole${mole.bomb ? " is-bomb" : ""}`}>
                  {mole.bomb ? "💣" : "🐹"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
