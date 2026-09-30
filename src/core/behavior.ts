/* ============================================================
   效用 AI —— 宠物自己决定做什么
   每次决策对所有候选行为打分，取最高分执行。

   utility = 基础权重
           × sigmoid(需求缺口)      ← 需求越低越想做（sigmoid 而非线性，
                                      这样缺口小时不着急，缺口大了急剧想要）
           × personality[关联动作]   ← 性格在这里发挥作用
           × 噪声                    ← 防止行为规律得像机器

   设计红线：自主行为只能「表达需求」，不能「满足需求」。
   宠物自己把饭吃了，玩家就没事可做了。所以除 groom / doze 有
   极小的自我照顾效果外，其余行为都不改变数值，只改变玩家看到的东西。
   ============================================================ */

import { AUTONOMY } from "./balance";
import type { ActionKey, BehaviorId, NeedKey, Pet } from "./types";

/** 动画类型 —— 多个行为可以共用一套动画 */
export type AnimKind =
  | "none"
  | "hop"
  | "stretch"
  | "yawn"
  | "groom"
  | "spin"
  | "beg"
  | "whimper"
  | "doze";

export interface BehaviorDef {
  id: BehaviorId;
  anim: AnimKind;
  /** 由哪条需求的缺口驱动 */
  drivenBy?: NeedKey;
  /** 关联动作 —— 性格权重通过它影响该行为的出现频率 */
  relatedAction?: ActionKey;
  baseWeight: number;
  durationMs: number;
  /** 自主造成的数值变化，只允许极小量 */
  effects?: Partial<Record<NeedKey, number>>;
  /** 是否弹气泡。纯发呆类不弹，否则气泡会一直挂在屏幕上 */
  bubble: boolean;
}

const LIST: readonly BehaviorDef[] = [
  /* ---- 无驱动：日常小动作，构成「活着」的底噪 ---- */
  { id: "idle", anim: "none", baseWeight: 3.2, durationMs: 2600, bubble: false },
  { id: "lookAround", anim: "none", relatedAction: "talk", baseWeight: 1.6, durationMs: 2600, bubble: false },
  { id: "hop", anim: "hop", relatedAction: "play", baseWeight: 1.4, durationMs: 700, bubble: false },
  { id: "stretch", anim: "stretch", baseWeight: 1.1, durationMs: 1100, bubble: false },
  { id: "spin", anim: "spin", relatedAction: "play", baseWeight: 0.9, durationMs: 900, bubble: false },
  { id: "stare", anim: "none", relatedAction: "photo", baseWeight: 1.0, durationMs: 2600, bubble: false },

  /* ---- 需求驱动：让玩家看得见它缺什么 ---- */
  {
    id: "groom",
    anim: "groom",
    drivenBy: "cleanliness",
    relatedAction: "bathe",
    baseWeight: 1.5,
    durationMs: 1000,
    effects: { cleanliness: 3 },
    bubble: true,
  },
  {
    id: "yawn",
    anim: "yawn",
    drivenBy: "energy",
    relatedAction: "sleep",
    baseWeight: 1.6,
    durationMs: 1200,
    bubble: true,
  },
  {
    id: "doze",
    anim: "doze",
    drivenBy: "energy",
    relatedAction: "sleep",
    baseWeight: 1.4,
    durationMs: 2000,
    effects: { energy: 4 },
    bubble: true,
  },
  {
    id: "begFood",
    anim: "beg",
    drivenBy: "satiety",
    relatedAction: "feed",
    baseWeight: 1.8,
    durationMs: 1200,
    bubble: true,
  },
  {
    id: "begPlay",
    anim: "beg",
    drivenBy: "mood",
    relatedAction: "play",
    baseWeight: 1.5,
    durationMs: 1200,
    bubble: true,
  },
  {
    id: "begPet",
    anim: "beg",
    drivenBy: "mood",
    relatedAction: "pet",
    baseWeight: 1.6,
    durationMs: 1200,
    bubble: true,
  },
  {
    id: "whimper",
    anim: "whimper",
    drivenBy: "mood",
    relatedAction: "pet",
    baseWeight: 1.0,
    durationMs: 1000,
    bubble: true,
  },
];

export const BEHAVIORS = Object.fromEntries(LIST.map((b) => [b.id, b])) as Record<
  BehaviorId,
  BehaviorDef
>;

/**
 * 动画类型 → CSS 类名后缀（样式见 petAnimations.css 的 react-* 系列）。
 * 多个行为复用同一套动画：打哈欠和打瞌睡都是「困」，没必要画两遍。
 */
export const ANIM_CLASS: Record<AnimKind, string> = {
  none: "",
  hop: "hop",
  stretch: "stretch",
  yawn: "yawn",
  groom: "wiggle",
  spin: "spin",
  beg: "beg",
  whimper: "refuse",
  doze: "doze",
};

/** 标准 logistic 函数 */
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * 需求缺口 → 动机强度。
 * 刻意用 sigmoid 而不是线性：需求 90 和 100 几乎没有区别，
 * 但需求 20 和 10 之间的紧迫感差很远。线性会让宠物在需求还不错的时候
 * 就开始频繁讨食，显得很烦。
 */
export function driveFrom(deficit: number): number {
  // 缺口 0 → 0.04，缺口 0.5 → 0.57，缺口 1 → 0.98
  return sigmoid(deficit * 7 - 3.2);
}

/** 单个行为的效用得分 */
export function scoreBehavior(
  def: BehaviorDef,
  pet: Pet,
  noise: number,
): number {
  let score = def.baseWeight;

  if (def.drivenBy) {
    const deficit = Math.max(0, 1 - pet.needs[def.drivenBy] / 100);
    // 1.9 这个系数是模拟器调出来的。
    // 关键认知：乞食行为不是只跟 idle 竞争，而是要在 13 个候选里拿第一，
    // 所以即使得分只比 idle 略高，频次占比也会高得离谱 ——
    // 系数 2.6 时饿极了的宠物 91% 的行为都是讨食，其它小动作全被淹没。
    score *= driveFrom(deficit) * 1.9;
  }

  // 性格在这里起作用：偏好玩耍的宠物会更频繁地自己蹦跶和讨玩
  if (def.relatedAction) {
    score *= pet.personality[def.relatedAction];
  }

  return score * noise;
}

/**
 * 选一个行为。
 * @param rand    返回 [0,1) 的随机源，便于测试注入
 * @param exclude 上一个行为，短时间内不再重复选它
 */
export function pickBehavior(
  pet: Pet,
  rand: () => number = Math.random,
  exclude?: BehaviorId | null,
): BehaviorDef {
  let best = BEHAVIORS.idle;
  let bestScore = -Infinity;

  for (const def of LIST) {
    if (def.id === exclude && def.id !== "idle") continue;
    // 噪声幅度是个需要拿捏的量：
    //   太宽 → 胜负由「谁掷得高」决定，分数形同虚设，宠物行为失去状态相关性；
    //   太窄 → 最高分行为赢得太稳定，宠物变得可预测、像机器。
    // 1.8 倍跨度是模拟器试出来的折中。
    const score = scoreBehavior(def, pet, 0.72 + rand() * 0.56);
    if (score > bestScore) {
      bestScore = score;
      best = def;
    }
  }

  return best;
}

/** 下一次自主行为的间隔（ms），带随机 */
export function nextBehaviorDelay(rand: () => number = Math.random): number {
  const { minGapMs, maxGapMs } = AUTONOMY;
  return minGapMs + rand() * (maxGapMs - minGapMs);
}
