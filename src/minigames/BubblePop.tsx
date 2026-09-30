/* ============================================================
   泡泡消除
   点破往上升的泡泡。混在其中的深色泡泡是陷阱，点错扣分 ——
   这一条让游戏从「手速测试」变成「需要看一眼再点」。
   ============================================================ */

import { useCallback, useRef } from "react";

import { playSfx } from "../audio";

import type { GameProps } from "./types";
import { useCanvasLoop } from "./useCanvasLoop";

const SPAWN_START_MS = 640;
const SPAWN_MIN_MS = 260;
/** 陷阱泡泡出现概率，随时间缓慢上升 */
const BAD_START = 0.12;
const BAD_MAX = 0.28;

const GOOD_COLORS = [
  { fill: "rgba(255,107,157,0.55)", stroke: "#FF6B9D" },
  { fill: "rgba(78,205,196,0.55)", stroke: "#4ECDC4" },
  { fill: "rgba(199,160,255,0.55)", stroke: "#C7A0FF" },
  { fill: "rgba(255,164,91,0.55)", stroke: "#FFA45B" },
];
const BAD_COLOR = { fill: "rgba(74,59,99,0.72)", stroke: "#2E2140" };

interface Bubble {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  bad: boolean;
  colorIndex: number;
  wobble: number;
}

export function BubblePop({ onScore }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bubbles = useRef<Bubble[]>([]);
  const elapsed = useRef(0);
  const nextSpawn = useRef(0);
  const seed = useRef(7);

  const rand = () => {
    seed.current = (seed.current * 1103515245 + 12345) & 0x7fffffff;
    return seed.current / 0x7fffffff;
  };

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      if (rect.width === 0) return;

      // 从后往前找（后画的在上层），命中即止
      for (let i = bubbles.current.length - 1; i >= 0; i--) {
        const b = bubbles.current[i];
        if (!b) continue;
        const dx = px - b.x;
        const dy = py - b.y;
        // 判定半径放宽 8px：手指比鼠标粗，严格圆判定会显得「点不中」
        if (dx * dx + dy * dy <= (b.r + 8) * (b.r + 8)) {
          bubbles.current.splice(i, 1);
          onScore(b.bad ? -3 : 1);
          playSfx(b.bad ? "badPop" : "pop");
          return;
        }
      }
      // 点空不扣分 —— 惩罚「点空」会让人不敢点，反而不好玩
    },
    [onScore],
  );

  const step = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, dtMs: number) => {
      if (w === 0 || h === 0) return;

      elapsed.current += dtMs;
      const ramp = Math.min(1, elapsed.current / 40_000);
      const spawnGap = SPAWN_START_MS - (SPAWN_START_MS - SPAWN_MIN_MS) * ramp;
      const badChance = BAD_START + (BAD_MAX - BAD_START) * ramp;

      nextSpawn.current -= dtMs;
      if (nextSpawn.current <= 0) {
        nextSpawn.current = spawnGap * (0.7 + rand() * 0.6);
        const r = 22 + rand() * 16;
        bubbles.current.push({
          x: r + rand() * Math.max(1, w - r * 2),
          y: h + r,
          r,
          vy: 0.055 + rand() * 0.045 + ramp * 0.03,
          vx: (rand() - 0.5) * 0.02,
          bad: rand() < badChance,
          colorIndex: Math.floor(rand() * GOOD_COLORS.length),
          wobble: rand() * Math.PI * 2,
        });
      }

      // 逐个生成新对象而不是原地修改：原地改被 ref 持有的对象会被
      // React 的不可变性规则判为「修改了传给 Hook 的值」。
      // 每帧十几个小对象的分配开销可以忽略。
      const kept: Bubble[] = [];
      for (const b of bubbles.current) {
        const next: Bubble = {
          ...b,
          y: b.y - b.vy * dtMs,
          x: b.x + b.vx * dtMs,
          wobble: b.wobble + dtMs * 0.004,
        };

        // 左右边界反弹，避免泡泡飘出屏幕白白浪费
        if (next.x < next.r) {
          next.x = next.r;
          next.vx = Math.abs(next.vx);
        } else if (next.x > w - next.r) {
          next.x = w - next.r;
          next.vx = -Math.abs(next.vx);
        }

        if (next.y + next.r < 0) continue; // 飘出顶部，移除
        kept.push(next);
      }
      bubbles.current = kept;

      /* ---------------- 绘制 ---------------- */

      ctx.clearRect(0, 0, w, h);

      for (const b of bubbles.current) {
        const wobbleX = Math.sin(b.wobble) * 2.5;
        const cx = b.x + wobbleX;

        const palette = b.bad ? BAD_COLOR : GOOD_COLORS[b.colorIndex] ?? GOOD_COLORS[0]!;

        ctx.beginPath();
        ctx.arc(cx, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = palette.fill;
        ctx.fill();
        ctx.strokeStyle = palette.stroke;
        ctx.lineWidth = 3;
        ctx.stroke();

        // 高光：让泡泡有体积感，纯色圆看起来像平面贴图
        ctx.beginPath();
        ctx.arc(cx - b.r * 0.32, b.y - b.r * 0.36, b.r * 0.24, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fill();

        if (b.bad) {
          ctx.font = `${Math.round(b.r * 0.9)}px system-ui`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("💀", cx, b.y + 1);
        }
      }
    },
    // 得分只发生在点击处理里，渲染循环不碰分数，所以不依赖 onScore
    [],
  );

  useCanvasLoop(canvasRef, step);

  return (
    <canvas
      ref={canvasRef}
      className="mg__canvas"
      onPointerDown={handlePointerDown}
    />
  );
}
