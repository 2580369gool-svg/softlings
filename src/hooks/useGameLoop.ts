import { useEffect } from "react";

import { TICK_MS } from "../core/balance";
import { persist } from "../core/save";
import { useGameStore } from "../store/gameStore";

/**
 * 游戏主循环 + 移动端生命周期处理。
 *
 * 移动端关键点：手机息屏或切到后台时，浏览器会冻结定时器。
 * 所以不能只依赖 setInterval —— 必须在重新可见时立刻补算一次，
 * 否则玩家切回来会看到「时间静止」的假象。
 */
export function useGameLoop() {
  const init = useGameStore((s) => s.init);
  const tick = useGameStore((s) => s.tick);

  // 启动：读档 + 离线补算
  useEffect(() => {
    init();
  }, [init]);

  // 前台定时推进
  useEffect(() => {
    const id = window.setInterval(() => tick(), TICK_MS);
    return () => window.clearInterval(id);
  }, [tick]);

  // 切回前台 / 息屏唤醒：立即补算并落盘
  useEffect(() => {
    const onResume = () => {
      if (document.visibilityState === "visible") {
        tick();
      } else {
        // 进入后台前先存一次，降低被系统杀进程丢档的概率
        const sim = useGameStore.getState().sim;
        if (sim) persist(sim);
      }
    };

    document.addEventListener("visibilitychange", onResume);
    window.addEventListener("pageshow", onResume);
    window.addEventListener("pagehide", onResume);

    return () => {
      document.removeEventListener("visibilitychange", onResume);
      window.removeEventListener("pageshow", onResume);
      window.removeEventListener("pagehide", onResume);
    };
  }, [tick]);
}
