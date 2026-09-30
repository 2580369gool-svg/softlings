/* ============================================================
   节奏敲击
   音符从上方落下，在判定线附近点对应轨道得分。
   越接近判定线分越高：完美 +3 / 良好 +1 / 没打到不计分。

   实现上刻意不用渲染循环：音符的位移交给 CSS 动画，
   而判定位置由「当前时间 − 生成时间」直接算出来。
   这样 60fps 全部由合成器承担，React 只在音符增减时渲染。
   ============================================================ */

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { playSfx } from "../audio";

import type { GameProps } from "./types";

const LANES = 4;
/** 音符从顶端落到底部所需时长。落得越快，留给反应的时间越短。 */
const FALL_MS = 1_380;
/** 判定线在轨道高度的百分比 */
const HIT_LINE = 0.82;
/** 完美 / 良好的判定窗口（占全程比例）—— 收窄后完美判定才有含金量 */
const PERFECT_WINDOW = 0.052;
const GOOD_WINDOW = 0.125;
/** 生成间隔 */
const SPAWN_START_MS = 580;
const SPAWN_MIN_MS = 270;

interface Note {
  id: number;
  lane: number;
  spawnAt: number;
  hit: boolean;
}

export function RhythmTap({ onScore }: GameProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState<Note[]>([]);
  const [flash, setFlash] = useState<{ id: number; kind: string } | null>(null);

  const seq = useRef(0);
  // 初值 0，真正的起始时刻在挂载 effect 里设置（render 期间不调用 Date.now）
  const startedAt = useRef(0);
  const timers = useRef<number[]>([]);

  /** 计算某个音符当前的落点进度（0 = 顶端，1 = 底部） */
  const progressOf = (note: Note, now = Date.now()) =>
    (now - note.spawnAt) / FALL_MS;

  /* ---------------- 生成音符 ---------------- */

  useEffect(() => {
    startedAt.current = Date.now();
    let cancelled = false;

    const spawn = () => {
      if (cancelled) return;
      const elapsed = Date.now() - startedAt.current;
      const ramp = Math.min(1, elapsed / 26_000);
      const gap = SPAWN_START_MS - (SPAWN_START_MS - SPAWN_MIN_MS) * ramp;

      const id = ++seq.current;
      const note: Note = {
        id,
        lane: Math.floor(Math.random() * LANES),
        spawnAt: Date.now(),
        hit: false,
      };
      setNotes((prev) => [...prev, note]);

      // 落下后自动清理
      const cleanup = window.setTimeout(() => {
        setNotes((prev) => prev.filter((n) => n.id !== id));
      }, FALL_MS + 260);
      timers.current.push(cleanup);

      const next = window.setTimeout(spawn, gap * (0.8 + Math.random() * 0.4));
      timers.current.push(next);
    };

    const first = window.setTimeout(spawn, 500);
    timers.current.push(first);

    return () => {
      cancelled = true;
      for (const id of timers.current) window.clearTimeout(id);
      timers.current = [];
    };
  }, []);

  /* ---------------- 判定 ---------------- */

  const handleLane = useCallback(
    (lane: number) => {
      const now = Date.now();

      // 在目标轨道里找离判定线最近的未击音符
      let best: Note | null = null;
      let bestDist = Infinity;
      for (const n of notes) {
        if (n.hit || n.lane !== lane) continue;
        const dist = Math.abs(progressOf(n) - HIT_LINE);
        if (dist < bestDist) {
          bestDist = dist;
          best = n;
        }
      }

      if (!best || bestDist > GOOD_WINDOW) {
        // 点空不扣分，但给一个视觉反馈让玩家知道点到了
        playSfx("miss");
        setFlash({ id: now, kind: "miss" });
        return;
      }

      const kind = bestDist <= PERFECT_WINDOW ? "perfect" : "good";
      playSfx(kind === "perfect" ? "perfect" : "good");
      onScore(kind === "perfect" ? 3 : 1);
      setNotes((prev) => prev.map((n) => (n.id === best.id ? { ...n, hit: true } : n)));
      setFlash({ id: now, kind });
    },
    [notes, onScore],
  );

  const flashText = flash ? t(`rhythm.${flash.kind}`) : "";

  return (
    <div className="rhythm">
      <div className="rhythm__lanes">
        {Array.from({ length: LANES }, (_, lane) => (
          <button
            key={lane}
            type="button"
            className="rhythm__lane"
            onPointerDown={() => handleLane(lane)}
            aria-label={t("rhythm.lane", { n: lane + 1 })}
          >
            {notes
              .filter((n) => n.lane === lane && !n.hit)
              .map((n) => (
                <span
                  key={n.id}
                  className="rhythm__note"
                  style={{ animationDuration: `${FALL_MS}ms` }}
                />
              ))}
          </button>
        ))}
        <div className="rhythm__hitline" style={{ top: `${HIT_LINE * 100}%` }} />
      </div>

      {flash && (
        <div className={`rhythm__flash rhythm__flash--${flash.kind}`} key={flash.id}>
          {flashText}
        </div>
      )}
    </div>
  );
}
