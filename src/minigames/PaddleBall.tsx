/* ============================================================
   挡球
   手指左右滑动控制挡板，别让球掉下去。每接住一次得分，球速略增。

   机制上和已有的都不同：考的是**持续跟踪** ——
   不是点一下就完，而是三十多秒里手不能停。
   漏三次结束（提前收场，外壳会照常结算分数）。
   ============================================================ */

import { useCallback, useRef } from "react";

import { playSfx } from "../audio";

import type { GameProps } from "./types";
import { useCanvasLoop } from "./useCanvasLoop";

/** 挡板所在高度（归一化） */
const PADDLE_Y = 0.82;
/** 挡板半宽（归一化） */
const PADDLE_HALF = 0.13;
/** 初始球速（归一化单位 / 毫秒） */
const SPEED_START = 0.00042;
/** 每接住一次加速 */
const SPEED_STEP = 1.035;
/** 速度上限 —— 不封顶的话后期完全没法接 */
const SPEED_MAX = 0.00115;
/** 允许漏掉的次数 */
const MAX_MISSES = 3;

export function PaddleBall({ onScore, onEarlyFinish }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paddleX = useRef(0.5);

  const ball = useRef({ x: 0.5, y: 0.5, vx: 0.0003, vy: -SPEED_START, speed: SPEED_START });
  const misses = useRef(0);
  const done = useRef(false);

  const handlePointer = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    paddleX.current = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  }, []);

  /** 把球放回中间重新发球，方向略作随机避免每次都一样 */
  const reset = useCallback(() => {
    const dir = Math.random() < 0.5 ? -1 : 1;
    ball.current = {
      x: 0.5,
      y: 0.5,
      vx: dir * SPEED_START * 0.7,
      vy: -SPEED_START,
      speed: SPEED_START,
    };
  }, []);

  const step = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, dtMs: number) => {
      if (w === 0 || h === 0) return;

      const b = ball.current;

      if (!done.current) {
        b.x += b.vx * dtMs;
        b.y += b.vy * dtMs;

        // 左右墙反弹
        if (b.x <= 0) {
          b.x = 0;
          b.vx = Math.abs(b.vx);
          playSfx("flip");
        } else if (b.x >= 1) {
          b.x = 1;
          b.vx = -Math.abs(b.vx);
          playSfx("flip");
        }
        // 顶墙反弹
        if (b.y <= 0) {
          b.y = 0;
          b.vy = Math.abs(b.vy);
        }

        // 与挡板的碰撞：只在球向下运动时判定，否则会「穿过去又被弹回来」
        if (b.vy > 0 && b.y >= PADDLE_Y - 0.02 && b.y <= PADDLE_Y + 0.06) {
          if (Math.abs(b.x - paddleX.current) <= PADDLE_HALF) {
            b.y = PADDLE_Y - 0.02;
            // 反弹角度由撞击位置决定，靠边打出去的球角度更斜（更有操作感）
            const offset = (b.x - paddleX.current) / PADDLE_HALF;
            b.speed = Math.min(SPEED_MAX, b.speed * SPEED_STEP);
            b.vx = offset * b.speed * 0.9;
            b.vy = -Math.sqrt(Math.max(0.00001, b.speed * b.speed - b.vx * b.vx));
            playSfx("catch");
            onScore(1);
          }
        }

        // 掉出底部
        if (b.y > 1.06) {
          misses.current += 1;
          playSfx("lose");
          if (misses.current >= MAX_MISSES) {
            done.current = true;
            window.setTimeout(onEarlyFinish, 400);
          } else {
            reset();
          }
        }
      }

      /* ---------------- 绘制 ---------------- */

      ctx.clearRect(0, 0, w, h);

      // 顶部一条淡参考线，帮玩家预判落点
      ctx.strokeStyle = "rgba(74,59,99,0.08)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const y = (h / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // 球
      ctx.beginPath();
      ctx.arc(b.x * w, b.y * h, Math.max(8, w * 0.035), 0, Math.PI * 2);
      ctx.fillStyle = "#FF6B9D";
      ctx.fill();
      ctx.strokeStyle = "#4A3B63";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 挡板
      const px = paddleX.current * w;
      const pw = PADDLE_HALF * w;
      const ph = Math.max(10, h * 0.026);
      const py = PADDLE_Y * h;
      ctx.beginPath();
      ctx.roundRect(px - pw, py, pw * 2, ph, ph / 2);
      ctx.fillStyle = "#4ECDC4";
      ctx.fill();
      ctx.strokeStyle = "#4A3B63";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 剩余机会
      ctx.font = `${Math.round(Math.max(16, w * 0.05))}px system-ui`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      for (let i = 0; i < MAX_MISSES; i++) {
        ctx.globalAlpha = i < MAX_MISSES - misses.current ? 1 : 0.22;
        ctx.fillText("❤️", 10 + i * (w * 0.075), 10);
      }
      ctx.globalAlpha = 1;
    },
    [onEarlyFinish, onScore, reset],
  );

  useCanvasLoop(canvasRef, step);

  return (
    <canvas
      ref={canvasRef}
      className="mg__canvas"
      onPointerDown={handlePointer}
      onPointerMove={handlePointer}
    />
  );
}
