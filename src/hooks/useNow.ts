import { useEffect, useState } from "react";

/**
 * 定时重渲染用的「当前时间」。
 * 只给需要显示冷却进度 / 气泡倒计时的组件用 —— 不要让整个游戏树跟着它重渲染。
 */
export function useNow(intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
