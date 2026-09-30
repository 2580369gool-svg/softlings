/* ============================================================
   宠物交互舞台
   承载手机端独有的触摸玩法：手指滑过宠物 → 它盯着你的手指看，
   来回抚摸 → 冒爱心 + 加心情。

   为什么不用「摸摸」按钮代替：按钮是「我命令它」，抚摸是「我陪它」。
   后者才是养成游戏情绪价值的来源，也是鼠标端做不出来的差异点。
   ============================================================ */

import { useCallback, useEffect, useRef, useState } from "react";

import { STROKE, TAP_MAX_MOVE_PX } from "../core/balance";
import type { PetStatus, Species, Stage } from "../core/types";
import type { Equipped } from "../core/wardrobe";

import { gazeFromPoint, STILL_GAZE, type Gaze } from "./gaze";
import { PetSvg } from "./PetSvg";

/** 抚摸时冒出的粒子配色 —— 糖果色板里的暖色 */
const HEART_COLORS = ["#FF6B9D", "#FFA45B", "#C7A0FF", "#FF6B9D"] as const;

/** 粒子存活时长，要和 CSS 里的 pet-particle-float 时长对齐 */
const PARTICLE_TTL_MS = 1100;

/** 手指离开多久之后，宠物开始自己东张西望 */
const IDLE_GAZE_AFTER_MS = 2600;

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  scale: number;
}

interface PetStageProps {
  species: Species;
  stage: Stage;
  evolution?: string | null;
  hatchProgress?: number;
  accessories?: Equipped;
  status: PetStatus;
  reaction?: { kind: string; key: number } | null;
  /** 完成一次有效抚摸 */
  onStroke: () => void;
  /** 点一下宠物（等价于「摸摸」按钮） */
  onTap?: () => void;
}

export function PetStage({
  species,
  stage,
  evolution = null,
  hatchProgress = 0,
  accessories = {},
  status,
  reaction,
  onStroke,
  onTap,
}: PetStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const petRef = useRef<HTMLDivElement>(null);

  const [gaze, setGaze] = useState<Gaze>(STILL_GAZE);
  const [pressing, setPressing] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  // 用 ref 存高频变化的值，避免每次 pointermove 都触发重渲染
  const strokeAccum = useRef(0);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const pressStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastStrokeAt = useRef(0);
  const lastPointerAt = useRef(0);
  const particleSeq = useRef(0);
  // pressing 的 ref 镜像：指针事件里要同步读取最新值，不能等 state 更新。
  // 只在事件处理器里写，绝不在 render 期间写 —— 那是 React 的禁忌。
  const pressingRef = useRef(false);

  const spawnParticle = useCallback((clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const id = ++particleSeq.current;
    const jitterX = (Math.random() - 0.5) * 34;
    const jitterY = (Math.random() - 0.5) * 22;

    const particle: Particle = {
      id,
      x: clientX - rect.left + jitterX,
      y: clientY - rect.top + jitterY,
      color: HEART_COLORS[id % HEART_COLORS.length] ?? "#FF6B9D",
      scale: 0.75 + Math.random() * 0.55,
    };

    setParticles((prev) => [...prev, particle]);
    window.setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== id));
    }, PARTICLE_TTL_MS);
  }, []);

  /* ---------------- 指针事件 ---------------- */

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // 捕获指针：手指滑出宠物区域也继续收到事件，不然抚摸会中途断掉
    e.currentTarget.setPointerCapture(e.pointerId);
    setPressing(true);
    pressingRef.current = true;
    strokeAccum.current = 0;
    lastPoint.current = { x: e.clientX, y: e.clientY };
    pressStart.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    lastPointerAt.current = performance.now();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const now = performance.now();
    lastPointerAt.current = now;

    // 视线永远跟着手指，即使没按住
    const petEl = petRef.current;
    if (petEl) {
      setGaze(gazeFromPoint(e.clientX, e.clientY, petEl.getBoundingClientRect()));
    }

    if (!pressingRef.current) return;

    const prev = lastPoint.current;
    lastPoint.current = { x: e.clientX, y: e.clientY };
    if (!prev) return;

    strokeAccum.current += Math.hypot(e.clientX - prev.x, e.clientY - prev.y);

    if (strokeAccum.current >= STROKE.distance) {
      strokeAccum.current = 0;
      // 节流：防止快速抖动刷心情
      if (now - lastStrokeAt.current >= STROKE.minIntervalMs) {
        lastStrokeAt.current = now;
        onStroke();
        spawnParticle(e.clientX, e.clientY);
      }
    }
  };

  const endPress = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = pressStart.current;
    setPressing(false);
    pressingRef.current = false;
    strokeAccum.current = 0;
    lastPoint.current = null;
    pressStart.current = null;

    // 位移很小、时间很短 → 判定为「点了一下」，等价于摸摸按钮
    if (start && onTap) {
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      const held = performance.now() - start.t;
      if (moved < TAP_MAX_MOVE_PX && held < 320) onTap();
    }
  };

  const handlePointerLeave = () => {
    // 手指走了，目光慢慢收回来
    window.setTimeout(() => {
      if (!pressingRef.current && performance.now() - lastPointerAt.current > 600) {
        setGaze(STILL_GAZE);
      }
    }, 620);
  };

  /* ---------------- 没人理的时候自己东张西望 ---------------- */

  useEffect(() => {
    const id = window.setInterval(() => {
      if (pressingRef.current) return;
      if (performance.now() - lastPointerAt.current < IDLE_GAZE_AFTER_MS) return;
      // 小幅游移，太大就不像发呆而像抽搐了
      setGaze({
        x: (Math.random() - 0.5) * 1.1,
        y: (Math.random() - 0.5) * 0.6,
      });
    }, 2800);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      ref={stageRef}
      className={`pet-stage${pressing ? " is-pressing" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPress}
      onPointerCancel={endPress}
      onPointerLeave={handlePointerLeave}
    >
      <div ref={petRef} className="pet-stage__pet">
        <PetSvg
          species={species}
          stage={stage}
          evolution={evolution}
          hatchProgress={hatchProgress}
          accessories={accessories}
          status={status}
          gaze={gaze}
          reaction={reaction}
        />
      </div>

      {particles.map((p) => (
        <span
          key={p.id}
          className="pet-particle"
          style={{
            left: p.x,
            top: p.y,
            ["--particle-color" as string]: p.color,
            ["--particle-scale" as string]: p.scale,
          }}
        >
          <HeartIcon />
        </span>
      ))}
    </div>
  );
}

/** 手绘的心形 —— 用 SVG 而不是 emoji，保证各平台渲染一致且能控制颜色 */
function HeartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 21C12 21 3 14.5 3 8.5C3 5.5 5.5 3 8.5 3C10.3 3 11.5 4 12 5C12.5 4 13.7 3 15.5 3C18.5 3 21 5.5 21 8.5C21 14.5 12 21 12 21Z"
        fill="var(--particle-color, #FF6B9D)"
        stroke="#4A3B63"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
