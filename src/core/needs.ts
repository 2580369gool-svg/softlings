/* ============================================================
   需求系统 —— 衰减、耦合、动作效果、状态派生
   全部是纯函数，输入输出都是数据，方便单独测试与批量模拟调参。
   ============================================================ */

import {
  ACTIONS,
  CARE_SCORE_TAU_MS,
  COUPLING,
  DECAY_PER_HOUR,
  NEED_MAX,
  NEGLECT_FLOOR,
  SLEEP,
  STATUS_THRESHOLDS,
} from "./balance";
import { NEED_KEYS, type ActionKey, type NeedKey, type Needs, type PetStatus } from "./types";

/**
 * 夹到合法区间。
 * 下限不是 0 而是 NEGLECT_FLOOR —— 需求永不归零，这是「宠物不会死」的实现方式。
 */
export function clampNeed(v: number): number {
  if (!Number.isFinite(v)) return NEGLECT_FLOOR;
  return Math.min(NEED_MAX, Math.max(NEGLECT_FLOOR, v));
}

/**
 * 心情衰减的耦合倍率。
 * 饿 / 脏 / 累都会让心情掉得更快 —— 数值上制造「照顾不全就出问题」的压力。
 */
export function moodCouplingFactor(needs: Needs): number {
  let factor = 1;
  for (const rule of COUPLING) {
    if (needs[rule.need] < rule.threshold) factor *= rule.factor;
  }
  return factor;
}

/** 复制一份需求，避免调用方拿到共享引用 */
export function cloneNeeds(needs: Needs): Needs {
  return {
    satiety: needs.satiety,
    cleanliness: needs.cleanliness,
    mood: needs.mood,
    energy: needs.energy,
  };
}

/**
 * 推进需求 dtMs 毫秒。
 * 注意：这是「一步」，离线补算由 clock.ts 切成很多步调用它。
 */
export function stepNeeds(needs: Needs, dtMs: number, sleeping: boolean): Needs {
  const hours = dtMs / 3_600_000;
  if (hours <= 0) return cloneNeeds(needs);

  const coupling = moodCouplingFactor(needs);
  const out = cloneNeeds(needs);

  for (const key of NEED_KEYS) {
    // 睡眠时精力走单独的回血逻辑，不参与衰减
    if (sleeping && key === "energy") continue;

    let rate = DECAY_PER_HOUR[key];
    if (key === "mood") rate *= coupling;
    if (sleeping) rate *= SLEEP.otherDecayFactor;

    out[key] = clampNeed(out[key] - rate * hours);
  }

  if (sleeping) {
    out.energy = clampNeed(out.energy + SLEEP.energyPerHour * hours);
  }

  return out;
}

/** 应用一次互动动作的即时效果 */
export function applyActionEffects(
  needs: Needs,
  action: ActionKey,
): Needs {
  const effects = ACTIONS[action].effects;
  const out = cloneNeeds(needs);
  for (const key of NEED_KEYS) {
    const delta = effects[key];
    if (delta === undefined) continue;
    out[key] = clampNeed(out[key] + delta);
  }
  return out;
}

/** 四条需求的平均值，用于粗略衡量宠物整体状态 */
export function averageNeed(needs: Needs): number {
  const sum = NEED_KEYS.reduce((acc, k) => acc + needs[k], 0);
  return sum / NEED_KEYS.length;
}

/**
 * 派生一个用于 UI 的状态。
 * 优先级：睡觉 > 难过 > 饿/脏/累 > 开心 > 一般
 */
export function deriveStatus(needs: Needs, sleeping: boolean): PetStatus {
  if (sleeping) return "sleeping";

  const { low, critical, happy } = STATUS_THRESHOLDS;
  const lowest = NEED_KEYS.reduce<NeedKey>(
    (min, k) => (needs[k] < needs[min] ? k : min),
    NEED_KEYS[0],
  );

  if (needs[lowest] < critical) {
    // 心情崩了叫「难过」，其他崩了按各自命名
    return lowest === "mood" ? "sad" : statusForNeed(lowest);
  }
  if (needs[lowest] < low) return statusForNeed(lowest);

  if (needs.mood >= happy && averageNeed(needs) >= 55) return "happy";
  return "normal";
}

function statusForNeed(key: NeedKey): PetStatus {
  switch (key) {
    case "satiety":
      return "hungry";
    case "cleanliness":
      return "dirty";
    case "energy":
      return "tired";
    case "mood":
      return "sad";
  }
}

/**
 * 照护质量分的指数移动平均更新。
 *
 * 为什么用 EMA 而不是累计值：累计值会让「养了 2 天」和「养了 20 天」的
 * 判定标准完全不同 —— 养得越久累积越高，路线就被时间长短而非照护质量决定了。
 * EMA 只看「近期照顾得怎么样」，且天然带时间常数，不受阶段长度影响。
 *
 * @param prev  上一次的照护分（0..1）
 * @param needs 当前需求
 * @param dtMs  经过时长
 */
export function updateCareScore(prev: number, needs: Needs, dtMs: number): number {
  if (dtMs <= 0) return prev;
  const quality = averageNeed(needs) / 100;
  // 指数衰减权重：离得越久的事件影响越小
  const alpha = 1 - Math.exp(-dtMs / CARE_SCORE_TAU_MS);
  return prev + (quality - prev) * alpha;
}
