/* ============================================================
   性格塑形
   玩家的养育习惯会改写宠物的性格权重，权重又反过来影响它自己的行为。
   这条反馈环是「宠物有自己的性格」这个感受的全部来源。
   ============================================================ */

import { PERSONALITY } from "./balance";
import { ACTION_KEYS, type ActionKey, type Personality } from "./types";

const { baseline, min, max, reinforceRate, relaxPerHour, traitThreshold } = PERSONALITY;

export function defaultPersonality(): Personality {
  return Object.fromEntries(ACTION_KEYS.map((k) => [k, baseline])) as Personality;
}

/**
 * 玩家做了一次动作 → 性格朝这个动作漂移。
 *
 * 用「朝上限渐进」而不是线性累加：越接近上限涨得越慢，
 * 既避免溢出，也天然形成「性格会饱和」的手感 ——
 * 一只宠物不可能在所有维度都拉满。
 */
export function reinforcePersonality(p: Personality, action: ActionKey): Personality {
  const out = { ...p };
  const current = out[action];
  out[action] = Math.min(max, current + (max - current) * reinforceRate);
  return out;
}

/**
 * 时间流逝 → 所有权重朝基准缓慢回归。
 * 没有哪种性格是永久的：玩家换了玩法，宠物也会慢慢变回中性。
 *
 * ⚠️ 插值系数必须用指数形式 1 − e^(−rate·hours)，不能用 rate × hours。
 *    后者在超过 1 小时后会大于 1，插值直接冲过基准值撞到下限 ——
 *    表现就是「放置一天回来，权重不是回到 1.0 而是掉到 0.35」。
 *    模拟器第 9 节盯着这个。
 */
export function relaxPersonality(p: Personality, dtMs: number): Personality {
  if (dtMs <= 0) return p;
  const hours = dtMs / 3_600_000;
  const factor = 1 - Math.exp(-relaxPerHour * hours);
  if (factor <= 0) return p;

  const out = {} as Personality;
  for (const key of ACTION_KEYS) {
    const v = p[key];
    out[key] = Math.max(min, Math.min(max, v + (baseline - v) * factor));
  }
  return out;
}

/**
 * 从权重推导性格标签（最多两个）。
 * 这是让「塑形」对玩家可见的关键 —— 后台悄悄改数值玩家是感受不到的，
 * 必须给这件事一个能被看见的名字。
 */
export function traitsOf(p: Personality, limit = 2): ActionKey[] {
  return ACTION_KEYS
    .filter((k) => p[k] >= traitThreshold)
    .sort((a, b) => p[b] - p[a])
    .slice(0, limit);
}

/** 权重最高的动作，用于决定宠物主动讨要什么 */
export function strongestPreference(p: Personality): ActionKey {
  return ACTION_KEYS.reduce((best, k) => (p[k] > p[best] ? k : best), ACTION_KEYS[0]);
}

/** 把权重归一化到 0..1，用于 UI 上的性格条 */
export function personalityLevel(v: number): number {
  return Math.max(0, Math.min(1, (v - min) / (max - min)));
}
