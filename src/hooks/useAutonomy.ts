import { useEffect } from "react";

import { nextBehaviorDelay, pickBehavior } from "../core/behavior";
import { useGameStore } from "../store/gameStore";

/**
 * 自主行为调度器。
 *
 * 关键实现细节：依赖数组必须为空。
 * 如果写成 `[sim]`，5 秒一次的 tick 会让这个 effect 反复重建、
 * 每次重置定时器 —— 结果就是宠物永远不会触发任何行为。
 * 所以这里只挂载一次，自己在内部用 getState() 取最新状态并自我重排。
 */
export function useAutonomy() {
  useEffect(() => {
    let timer: number | undefined;

    const schedule = () => {
      timer = window.setTimeout(() => {
        const { sim, setBehavior, lastBehaviorId } = useGameStore.getState();

        // 蛋里不舒服、睡着了、出门旅行中、或者页面在后台（省电）都不做小动作
        const canAct =
          sim !== null &&
          sim.pet.stage !== "egg" &&
          !sim.pet.sleeping &&
          sim.travel.active === null &&
          !document.hidden;

        if (canAct && sim) {
          setBehavior(pickBehavior(sim.pet, Math.random, lastBehaviorId));
        }

        schedule();
      }, nextBehaviorDelay());
    };

    schedule();
    return () => window.clearTimeout(timer);
  }, []);
}
