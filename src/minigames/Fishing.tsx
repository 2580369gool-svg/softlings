/* ============================================================
   钓鱼
   光标在力量条上来回扫，点一下停下；越接近绿色区中心分越高。
   共 5 次下钩机会。

   光标位置由「当前时间 − 起始时间」直接算出，而不是每帧读 DOM 位置 ——
   后者在低端机上会因为掉帧而判定偏移。
   ============================================================ */

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { playSfx } from "../audio";

import type { GameProps } from "./types";

const CASTS = 5;
/** 光标扫一个来回的时长 */
const SWEEP_MS = 1_250;
/** 绿区半宽与完美窗口半宽（占全条比例） */
const ZONE_HALF = 0.13;
const PERFECT_HALF = 0.045;
/** 每次判定结果停留多久再开始下一竿 */
const RESULT_HOLD_MS = 520;

/** 三角波：0→1→0 循环 */
function sweepPosition(now: number, startAt: number): number {
  const phase = ((now - startAt) % (SWEEP_MS * 2)) / SWEEP_MS;
  return phase <= 1 ? phase : 2 - phase;
}

export function Fishing({ onScore, onEarlyFinish }: GameProps) {
  const { t } = useTranslation();
  const [casts, setCasts] = useState(0);
  const [result, setResult] = useState<string | null>(null);

  const markerRef = useRef<HTMLDivElement>(null);
  // 初值 0，真正的起始时刻在挂载 effect 里设置（render 期间不调用 Date.now）
  const castStart = useRef(0);
  const frozen = useRef(false);
  const done = useRef(false);
  const castCount = useRef(0);

  /* ---------------- 光标动画 ---------------- */
  // 循环只在挂载时启动一次，中途不重建。
  // 绝对不能写在 render 里 —— 那会随每次重渲染产生新的 rAF 链。
  useEffect(() => {
    castStart.current = Date.now();
    let raf = 0;
    const tick = () => {
      if (!frozen.current && markerRef.current) {
        const pos = sweepPosition(Date.now(), castStart.current);
        // 标记是整条宽度的元素，只显示左边框，所以位移百分比正好等于位置
        markerRef.current.style.transform = `translateX(${pos * 100}%)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ---------------- 下钩 ---------------- */

  const handleCast = useCallback(() => {
    if (done.current || frozen.current) return;

    const pos = sweepPosition(Date.now(), castStart.current);
    const dist = Math.abs(pos - 0.5);

    let kind: string;
    let delta: number;
    if (dist <= PERFECT_HALF) {
      kind = "perfect";
      delta = 4;
    } else if (dist <= ZONE_HALF) {
      kind = "good";
      delta = 2;
    } else {
      kind = "miss";
      delta = 0;
    }

    frozen.current = true;
    playSfx(kind === "perfect" ? "perfect" : kind === "good" ? "good" : "miss");
    onScore(delta);
    setResult(kind);

    const n = ++castCount.current;
    setCasts(n);

    if (n >= CASTS) {
      done.current = true;
      // 留一点时间让玩家看清最后一次判定
      window.setTimeout(onEarlyFinish, 700);
      return;
    }

    window.setTimeout(() => {
      setResult(null);
      castStart.current = Date.now();
      frozen.current = false;
      // 下一竿开始的抛竿声，给「又要来了」的节奏感
      playSfx("cast");
    }, RESULT_HOLD_MS);
  }, [onEarlyFinish, onScore]);

  return (
    <div className="fishing">
      <p className="fishing__hint">{t("fishing.hint")}</p>

      <div className="fishing__water" aria-hidden="true">
        <span className="fishing__emoji">🎣</span>
        {result && (
          <span className={`fishing__result fishing__result--${result}`}>{t(`fishing.${result}`)}</span>
        )}
      </div>

      <div className="fishing__bar">
        <div
          className="fishing__zone"
          style={{ left: `${(0.5 - ZONE_HALF) * 100}%`, width: `${ZONE_HALF * 200}%` }}
        />
        <div
          className="fishing__perfect"
          style={{ left: `${(0.5 - PERFECT_HALF) * 100}%`, width: `${PERFECT_HALF * 200}%` }}
        />
        <div ref={markerRef} className="fishing__marker" />
      </div>

      {/* 移动端把整条都做成按钮：手指不用去精确戳那根细线 */}
      <button type="button" className="fishing__button" onPointerDown={handleCast}>
        {t("fishing.cast")}
      </button>

      <div className="fishing__casts">
        {Array.from({ length: CASTS }, (_, i) => (
          <span key={i} className={`fishing__pip${i < casts ? " is-used" : ""}`} />
        ))}
      </div>
    </div>
  );
}
