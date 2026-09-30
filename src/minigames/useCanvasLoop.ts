import { useEffect, type RefObject } from "react";

/**
 * Canvas 渲染循环。
 *
 * 处理了三件容易被忽略但会出问题的事：
 *  1. DPR 缩放 —— 不处理的话高分屏上画面是糊的；
 *  2. dt 上限 —— 切回前台时两帧间隔可能是几十秒，不夹住物理会瞬移；
 *  3. 容器尺寸变化 —— 用 ResizeObserver 而不是只在挂载时量一次。
 */
export function useCanvasLoop(
  ref: RefObject<HTMLCanvasElement | null>,
  step: (ctx: CanvasRenderingContext2D, w: number, h: number, dtMs: number) => void,
) {
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const tick = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      step(ctx, w, h, dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [ref, step]);
}
