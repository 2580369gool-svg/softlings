/* ============================================================
   叠塔
   方块左右滑动，点一下放下去。和下面那块的**重叠部分**决定得分与新的宽度，
   完全错开就结束。

   机制上和已有的都不同：考的是**时机精度**，而且难度会自我累积 ——
   每次没对准都会让方块变窄，下一块更难放稳。
   ============================================================ */

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { playSfx } from "../audio";

import type { GameProps } from "./types";

/** 初始方块宽度（归一化） */
const WIDTH_START = 0.52;
/** 滑动速度（归一化单位 / 毫秒），随塔高增加 */
const SPEED_START = 0.00055;
const SPEED_STEP = 1.05;
const SPEED_MAX = 0.0014;
/** 完美判定的容差 */
const PERFECT_EPS = 0.012;
/** 窄于这个宽度就没法继续了 */
const WIDTH_MIN = 0.06;
/** 块高（px） */
const BLOCK_PX = 26;
/** 视野里最多显示几块 */
const VISIBLE = 7;

interface Block {
  /** 中心位置 0..1 */
  x: number;
  /** 宽度 0..1 */
  width: number;
}

export function StackTower({ onScore, onEarlyFinish }: GameProps) {
  const { t } = useTranslation();
  const [blocks, setBlocks] = useState<Block[]>([{ x: 0.5, width: WIDTH_START }]);
  /**
   * 当前方块的宽度用 state，位置用 ref。
   * 分开的理由：宽度只在「放下」时变一次，用 state 天经地义；
   * 而位置每帧都变，必须走 ref —— 每帧 setState 会让 React 一秒重渲染 60 次。
   * 如果把两者都塞进 ref，render 期间读 ref 又会被 lint 拦住（而且确实不可靠）。
   */
  const [currentWidth, setCurrentWidth] = useState(WIDTH_START);

  const currentRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stageWidth = useRef(0);

  const moving = useRef({ x: 0.2, dir: 1, speed: SPEED_START });
  const done = useRef(false);
  const blocksRef = useRef(blocks);

  // 用 effect 同步 ref，而不是在 render 期间直接赋值 ——
  // render 期间写 ref 是 React 的禁忌，StrictMode 下还会跑两遍
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  // 宽度的 ref 镜像：渲染循环每帧要用它算边界，但不能每帧读 state（闭包会陈旧）
  const widthRef = useRef(WIDTH_START);
  useEffect(() => {
    widthRef.current = currentWidth;
  }, [currentWidth]);

  /* ---------------- 舞台宽度 ---------------- */

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      stageWidth.current = el.clientWidth;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---------------- 滑动 ---------------- */

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;

      const m = moving.current;
      const half = widthRef.current / 2;
      if (!done.current) {
        m.x += m.dir * m.speed * dt;
        // 撞到边界就掉头。留出半个宽度，方块不会探出画面
        if (m.x - half <= 0) {
          m.x = half;
          m.dir = 1;
        } else if (m.x + half >= 1) {
          m.x = 1 - half;
          m.dir = -1;
        }

        const el = currentRef.current;
        if (el && stageWidth.current > 0) {
          // m.x 是中心点，而 transform 定位的是元素左边缘，
          // 所以要减掉半个宽度，否则整块会向右偏半个身位
          el.style.transform = `translateX(${(m.x - half) * stageWidth.current}px)`;
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ---------------- 放置 ---------------- */

  const drop = useCallback(() => {
    if (done.current) return;

    const m = moving.current;
    const w = widthRef.current;
    const below = blocksRef.current[blocksRef.current.length - 1];
    if (!below) return;

    // 重叠区间：[max(左边界), min(右边界)]
    const left = Math.max(m.x - w / 2, below.x - below.width / 2);
    const right = Math.min(m.x + w / 2, below.x + below.width / 2);
    const overlap = right - left;

    if (overlap <= 0) {
      // 完全错开：结束
      done.current = true;
      playSfx("lose");
      window.setTimeout(onEarlyFinish, 500);
      return;
    }

    const perfect = Math.abs(m.x - below.x) <= PERFECT_EPS;
    // 完美时保留原宽度，否则裁到重叠部分 —— 这是难度自我累积的来源
    const newWidth = perfect ? w : overlap;
    const newX = perfect ? below.x : (left + right) / 2;

    onScore(perfect ? 5 : Math.max(1, Math.round((overlap / w) * 3)));
    playSfx(perfect ? "perfect" : "match");

    const nextBlocks = [...blocksRef.current, { x: newX, width: newWidth }];
    setBlocks(nextBlocks);
    setCurrentWidth(newWidth);

    if (newWidth < WIDTH_MIN) {
      done.current = true;
      window.setTimeout(onEarlyFinish, 500);
      return;
    }

    // 下一块：速度随塔高提升
    const speed = Math.min(SPEED_MAX, SPEED_START * Math.pow(SPEED_STEP, nextBlocks.length));
    moving.current = {
      x: Math.random() < 0.5 ? newWidth / 2 : 1 - newWidth / 2,
      dir: Math.random() < 0.5 ? 1 : -1,
      speed,
    };
  }, [onEarlyFinish, onScore]);

  const visible = blocks.slice(-VISIBLE);
  const offset = Math.max(0, blocks.length - VISIBLE) * BLOCK_PX;

  return (
    <div className="stack" ref={stageRef} onPointerDown={drop}>
      <p className="stack__hint">{t("stack.hint")}</p>

      <div className="stack__stage">
        {/* 已放好的方块 */}
        {visible.map((b, i) => (
          <div
            key={`${i}-${b.x.toFixed(4)}-${b.width.toFixed(4)}`}
            className="stack__block"
            style={{
              left: `${(b.x - b.width / 2) * 100}%`,
              width: `${b.width * 100}%`,
              bottom: `${i * BLOCK_PX - offset}px`,
              height: `${BLOCK_PX - 2}px`,
              background: `hsl(${200 + i * 14} 78% ${72 - (i % 3) * 4}%)`,
            }}
          />
        ))}

        {/* 正在滑动的方块：用 transform 定位，避免每帧改 left 触发重排 */}
        <div
          ref={currentRef}
          className="stack__block stack__block--current"
          style={{
            left: 0,
            width: `${currentWidth * 100}%`,
            bottom: `${visible.length * BLOCK_PX - offset}px`,
            height: `${BLOCK_PX - 2}px`,
          }}
        />
      </div>
    </div>
  );
}
