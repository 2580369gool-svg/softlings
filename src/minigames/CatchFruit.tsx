/* ============================================================
   接水果
   手指在屏幕上左右滑动控制篮子，接住掉下来的水果。
   漏掉不扣分（只有正反馈），但漏得多了分数自然上不去。
   ============================================================ */

import { useCallback, useRef } from "react";

import { playSfx } from "../audio";
import { BASKET_Y_RATIO } from "../core/balance";

import type { GameProps } from "./types";
import { useCanvasLoop } from "./useCanvasLoop";

const FRUITS = ["🍎", "🍊", "🍇", "🍓", "🍋", "🍑", "🍒", "🥝"];

/** 起始生成间隔与下限 —— 越往后掉得越密，构成难度曲线 */
const SPAWN_START_MS = 680;
const SPAWN_MIN_MS = 230;
/** 难度爬满所需时长。缩短之后 30 秒的局内也能明显感觉到变快。 */
const RAMP_MS = 22_000;

interface Fruit {
  x: number;
  y: number;
  vy: number;
  emoji: string;
}

export function CatchFruit({ onScore }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // 篮子位置用归一化坐标（0..1），这样和画布尺寸解耦
  const basketX = useRef(0.5);
  const fruits = useRef<Fruit[]>([]);
  const elapsed = useRef(0);
  const nextSpawn = useRef(0);
  const seed = useRef(1);

  /** 简单的确定性伪随机，避免依赖 Math.random 导致行为不可复现 */
  const rand = () => {
    seed.current = (seed.current * 1103515245 + 12345) & 0x7fffffff;
    return seed.current / 0x7fffffff;
  };

  const handlePointer = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    basketX.current = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  }, []);

  const step = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, dtMs: number) => {
      if (w === 0 || h === 0) return;

      elapsed.current += dtMs;

      // 难度爬升：生成间隔随时间收窄
      const ramp = Math.min(1, elapsed.current / RAMP_MS);
      const spawnGap = SPAWN_START_MS - (SPAWN_START_MS - SPAWN_MIN_MS) * ramp;

      nextSpawn.current -= dtMs;
      if (nextSpawn.current <= 0) {
        nextSpawn.current = spawnGap * (0.75 + rand() * 0.5);
        fruits.current.push({
          x: 0.08 + rand() * 0.84,
          y: -0.08,
          // 下落速度整体上调约 35%，配合更密的生成间隔一起加难度
          vy: 0.00048 + rand() * 0.00022 + ramp * 0.0003,
          emoji: FRUITS[Math.floor(rand() * FRUITS.length)] ?? "🍎",
        });
      }

      // 篮子放在 68% 高度而不是贴着底边。
      // 玩家是手指压着屏幕控制左右移动的，贴底会让手指正好盖住篮子和判定区，
      // 看不见自己接到了什么 —— 这是实机试出来的，不是想当然。
      const basketY = h * BASKET_Y_RATIO;
      const catchHalfWidth = Math.max(34, w * 0.11);
      const basketPx = basketX.current * w;

      // 更新位置并结算接住 / 漏掉
      const kept: Fruit[] = [];
      for (const f of fruits.current) {
        f.y += f.vy * dtMs;
        const px = f.x * w;
        const py = f.y * h;

        if (py >= basketY - 22 && py <= basketY + 26 && Math.abs(px - basketPx) <= catchHalfWidth) {
          onScore(1);
          playSfx("catch");
          continue; // 接住了，移除
        }
        // 落过篮子一段距离就算漏了。不给到屏幕底部才消失，
        // 否则水果会穿过篮子继续掉，看起来像「明明碰到了却没接住」
        if (py > basketY + 90) continue;
        kept.push(f);
      }
      fruits.current = kept;

      /* ---------------- 绘制 ---------------- */

      ctx.clearRect(0, 0, w, h);

      // 背景横向参考线，让横向位置更容易判断
      ctx.strokeStyle = "rgba(74,59,99,0.08)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const y = (h / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "30px system-ui";
      for (const f of fruits.current) {
        ctx.fillText(f.emoji, f.x * w, f.y * h);
      }

      // 篮子
      ctx.font = "40px system-ui";
      ctx.fillText("🧺", basketPx, basketY);

      // 接住范围提示 —— 让玩家知道判定宽度，避免「明明碰到了却没接住」的挫败
      ctx.strokeStyle = "rgba(255,107,157,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(basketPx - catchHalfWidth, basketY + 22);
      ctx.lineTo(basketPx + catchHalfWidth, basketY + 22);
      ctx.stroke();
    },
    [onScore],
  );

  useCanvasLoop(canvasRef, step);

  return (
    <canvas
      ref={canvasRef}
      className="mg__canvas"
      onPointerDown={handlePointer}
      onPointerMove={handlePointer}
      onPointerLeave={() => {
        basketX.current = 0.5;
      }}
    />
  );
}
