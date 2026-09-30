/* ============================================================
   时间引擎 —— 在线 tick 与离线补算共用同一段代码
   ============================================================ */

import {
  AUTO_SLEEP_ENERGY,
  HATCH_MS,
  MAX_RAW_ELAPSED_MS,
  OFFLINE_FULL_MS,
  OFFLINE_MAX_TAIL_MS,
  OFFLINE_STEP_MS,
  OFFLINE_TAIL_TAU_MS,
  SLEEP,
  TICK_MS,
  TRAVEL_NEED_RATE,
} from "./balance";
import { stepTravel } from "./travel";
import { stepHabitat } from "./habitat";
import { stepNeeds, updateCareScore } from "./needs";
import { relaxPersonality } from "./personality";
import type { OfflineReport, SimState } from "./types";

/**
 * 把原始经过时长折算成「有效结算时长」。
 *
 * 8 小时以内全额；超出部分走渐近饱和曲线，上限为 8h + 24h = 32 小时。
 * 结果：弃游 7 天、30 天、10 年，宠物状态完全一致，都是「难过但能救」。
 */
export function effectiveElapsed(rawMs: number): { effectiveMs: number; capped: boolean } {
  const clamped = Math.min(Math.max(rawMs, 0), MAX_RAW_ELAPSED_MS);
  if (clamped <= OFFLINE_FULL_MS) {
    return { effectiveMs: clamped, capped: false };
  }
  const tail = clamped - OFFLINE_FULL_MS;
  const extra = OFFLINE_MAX_TAIL_MS * (1 - Math.exp(-tail / OFFLINE_TAIL_TAU_MS));
  return { effectiveMs: OFFLINE_FULL_MS + extra, capped: true };
}

/** 单步推进：需求 + 睡眠状态 + 照护分 */
function step(state: SimState, dtMs: number): SimState {
  const { pet } = state;

  // 蛋阶段：需求冻结，只推进孵化进度。
  // 这一小段是「开场仪式」而不是玩法，所以不给玩家任何需要操心的事。
  if (pet.stage === "egg") {
    const hatchProgress = Math.min(1, pet.hatchProgress + dtMs / HATCH_MS);
    return {
      ...state,
      pet: {
        ...pet,
        hatchProgress,
        stage: hatchProgress >= 1 ? "baby" : "egg",
      },
      // 院子照常运转 —— 访客不关心蛋里是什么
      habitat: stepHabitat(state.habitat, dtMs),
    };
  }

  // 旅行推进要放在需求之前：这一步才知道宠物当前在不在家
  const travelStep = stepTravel(state.travel, dtMs);
  const traveling = travelStep.travel.active !== null || travelStep.arrived !== null;

  // 出门在外需求掉得慢得多 —— 否则长旅行回来会饿死，玩家就再也不敢用它
  const needDt = traveling ? dtMs * TRAVEL_NEED_RATE : dtMs;
  const needs = stepNeeds(pet.needs, needDt, pet.sleeping);

  let sleeping = pet.sleeping;

  // 睡饱了自动醒来
  if (sleeping && needs.energy >= SLEEP.wakeAt) sleeping = false;
  // 累垮了自己去睡 —— 玩家不管也不会卡在动不了的状态
  if (!sleeping && needs.energy <= AUTO_SLEEP_ENERGY) sleeping = true;

  return {
    ...state,
    pet: {
      ...pet,
      needs,
      sleeping,
      careScore: updateCareScore(pet.careScore, needs, dtMs),
      // 性格随时间朝基准回归 —— 久不互动，偏好会慢慢淡掉
      personality: relaxPersonality(pet.personality, dtMs),
    },
    // 家园推进：到访判定与访客停留都在这里结算。
    // 离线同样生效 —— 回来发现院子里来了只没见过的，是这套系统的核心体验。
    habitat: stepHabitat(state.habitat, dtMs),
    travel: travelStep.travel,
    // 归来奖励在这里入账，UI 从 lastTrip 读取要展示什么
    lastTrip: travelStep.arrived,
    economy: travelStep.arrived
      ? { ...state.economy, coins: state.economy.coins + travelStep.arrived.coins }
      : state.economy,
  };
}

/**
 * 把状态推进到 toMs 时刻。
 *
 * 关键设计：离线结算不做「速率 × 时长」的一步积分，而是切成固定步长
 * 循环推进。因为需求衰减是非线性的（心情衰减率本身依赖饱食度），
 * 一步积分会算错，而且离得越久错得越离谱。
 */
export function advanceTo(state: SimState, toMs: number): {
  state: SimState;
  report: OfflineReport | null;
} {
  const raw = toMs - state.clock.lastTickAt;
  if (raw <= 0) {
    // 系统时间被往回调了：不接受倒退，只把时间戳对齐，避免刷收益
    return {
      state: { ...state, clock: { ...state.clock, lastTickAt: toMs } },
      report: null,
    };
  }

  const { effectiveMs, capped } = effectiveElapsed(raw);
  const before = { ...state.pet.needs };

  // 在线的小间隔（<= 一个 tick）直接一步算完，省掉无谓的循环
  const steps = Math.max(1, Math.ceil(effectiveMs / OFFLINE_STEP_MS));
  const dt = effectiveMs / steps;

  let next = state;
  for (let i = 0; i < steps; i++) next = step(next, dt);

  next = {
    ...next,
    clock: {
      lastTickAt: toMs,
      totalPlayedMs: state.clock.totalPlayedMs + Math.min(raw, MAX_RAW_ELAPSED_MS),
    },
  };

  // 只有真的离线过（超过一个 tick）才生成报告给 UI 弹窗
  const report: OfflineReport | null =
    raw > TICK_MS * 2
      ? {
          elapsedMs: raw,
          effectiveMs,
          capped,
          before,
          after: { ...next.pet.needs },
        }
      : null;

  return { state: next, report };
}

/** 睡眠中精力回满就醒来（供 UI 立即反馈用，不等下一个 tick） */
export function wakeIfRested(state: SimState): SimState {
  if (state.pet.sleeping && state.pet.needs.energy >= SLEEP.wakeAt) {
    return { ...state, pet: { ...state.pet, sleeping: false } };
  }
  return state;
}
