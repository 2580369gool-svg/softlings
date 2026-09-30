/* ============================================================
   家园与野生访客
   抄《猫咪后院》的核心循环：摆东西 → 等它来 → 拍照收集。

   为什么值得做：主宠物只有一只，玩家的情感投入有限；
   而「不期而至的访客」能提供完全不同质感的快乐 ——
   不需要照顾、没有责任、纯收获。两种情绪互补，撑起更长的游玩周期。

   离线也会推进：回来打开游戏发现院子里来了一只没见过的，
   是这套系统最重要的一刻。
   ============================================================ */

import { HABITAT_SLOTS, VISITOR_STAY_MS, VISIT } from "./balance";
import { mulberry32 } from "./rng";

/* ---------------- 摆件 ---------------- */

export type PlacementId =
  | "foodBowl"
  | "birdSeed"
  | "cushion"
  | "toyMouse"
  | "waterBowl"
  | "flowerPot";

export interface PlacementDef {
  id: PlacementId;
  price: number;
}

export const PLACEMENTS: Record<PlacementId, PlacementDef> = {
  foodBowl: { id: "foodBowl", price: 30 },
  birdSeed: { id: "birdSeed", price: 24 },
  cushion: { id: "cushion", price: 36 },
  toyMouse: { id: "toyMouse", price: 42 },
  waterBowl: { id: "waterBowl", price: 28 },
  flowerPot: { id: "flowerPot", price: 34 },
};

export const PLACEMENT_IDS = Object.keys(PLACEMENTS) as PlacementId[];

export function isPlacementId(v: unknown): v is PlacementId {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(PLACEMENTS, v);
}

/* ---------------- 访客 ---------------- */

export type VisitorId =
  | "sparrow"
  | "squirrel"
  | "calico"
  | "raccoon"
  | "fox"
  | "ferret"
  | "frog"
  | "hedgehog"
  | "ladybug"
  | "rabbit";

export interface VisitorDef {
  id: VisitorId;
  /** 基础权重 */
  weight: number;
  /** 摆出这些摆件时权重提升 */
  likes: PlacementId[];
  /** 提升后的权重 */
  boostedWeight: number;
}

/**
 * 十只野生访客。
 * 每只都能在空院子出现（只是概率低），摆对它喜欢的东西会明显更容易来 ——
 * 这样「摆件」是有意义的决策，而不是「不摆就没有访客」的硬门槛。
 */
export const VISITORS: Record<VisitorId, VisitorDef> = {
  sparrow: { id: "sparrow", weight: 10, likes: ["birdSeed", "foodBowl"], boostedWeight: 26 },
  ladybug: { id: "ladybug", weight: 9, likes: ["flowerPot"], boostedWeight: 24 },
  squirrel: { id: "squirrel", weight: 6, likes: ["birdSeed", "flowerPot"], boostedWeight: 22 },
  frog: { id: "frog", weight: 5, likes: ["waterBowl"], boostedWeight: 22 },
  hedgehog: { id: "hedgehog", weight: 4, likes: ["waterBowl", "cushion"], boostedWeight: 20 },
  rabbit: { id: "rabbit", weight: 4, likes: ["flowerPot", "foodBowl"], boostedWeight: 20 },
  calico: { id: "calico", weight: 3, likes: ["cushion", "foodBowl"], boostedWeight: 18 },
  ferret: { id: "ferret", weight: 3, likes: ["cushion", "toyMouse"], boostedWeight: 17 },
  raccoon: { id: "raccoon", weight: 2, likes: ["foodBowl"], boostedWeight: 16 },
  fox: { id: "fox", weight: 2, likes: ["toyMouse", "foodBowl"], boostedWeight: 15 },
};

export const VISITOR_IDS = Object.keys(VISITORS) as VisitorId[];

export function isVisitorId(v: unknown): v is VisitorId {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(VISITORS, v);
}

/* ---------------- 状态 ---------------- */

export interface VisitorStay {
  id: VisitorId;
  /** 还会待多久（ms）—— 用剩余时长而不是绝对时刻，离线推进才能自然生效 */
  remainingMs: number;
  /** 是否已经拍过照。拍过之后它还会待一会儿，但不会再触发「新发现」 */
  photographed: boolean;
}

export interface Habitat {
  /** 院子里的三个格子，null 表示空着 */
  placed: (PlacementId | null)[];
  /** 当前到访的访客 */
  visitor: VisitorStay | null;
  /** 距离下一次「有没有访客来」的判定还有多久 */
  rollInMs: number;
  /** 上一只访客，用于避免连续两次都是同一只 */
  lastVisitorId: VisitorId | null;
  /** 随机数种子 —— 存在存档里，保证同样的存档演化出同样的结果 */
  seed: number;
}

export function createHabitat(seed = Date.now() >>> 0): Habitat {
  return {
    placed: Array.from({ length: HABITAT_SLOTS }, () => null),
    visitor: null,
    // 开局先等一小会儿，让玩家有时间去看看家园界面
    rollInMs: VISIT.rollIntervalMs,
    lastVisitorId: null,
    seed: seed >>> 0,
  };
}

/* ---------------- 到访判定 ---------------- */

/** 某只访客在当前摆设下的权重 */
export function weightFor(def: VisitorDef, placed: (PlacementId | null)[]): number {
  const liked = def.likes.some((p) => placed.includes(p));
  return liked ? def.boostedWeight : def.weight;
}

/** 当前院子的总吸引力，用于算到访概率 */
export function attractionOf(placed: (PlacementId | null)[]): number {
  return PLACEMENT_IDS.reduce((sum, id) => sum + placed.filter((p) => p === id).length, 0);
}

/** 依权重随机挑一只访客 */
function pickVisitor(
  placed: (PlacementId | null)[],
  lastVisitorId: VisitorId | null,
  rand: () => number,
): VisitorId {
  const entries = VISITOR_IDS.map((id) => {
    let w = weightFor(VISITORS[id], placed);
    // 刚来过的那只权重大幅降低，避免连着两次都是同一只
    if (id === lastVisitorId) w *= 0.15;
    return { id, w };
  });

  const total = entries.reduce((s, e) => s + e.w, 0);
  let r = rand() * total;
  for (const e of entries) {
    r -= e.w;
    if (r <= 0) return e.id;
  }
  return entries[entries.length - 1]?.id ?? "sparrow";
}

/**
 * 推进家园 dtMs。
 * 纯函数：同样的输入永远得到同样的输出，这样离线补算才可复现。
 */
export function stepHabitat(habitat: Habitat, dtMs: number): Habitat {
  if (dtMs <= 0) return habitat;

  // 有访客：只倒计时，不做新判定（同一时间只来一位）
  if (habitat.visitor) {
    const remaining = habitat.visitor.remainingMs - dtMs;
    if (remaining > 0) {
      return { ...habitat, visitor: { ...habitat.visitor, remainingMs: remaining } };
    }
    // 它走了
    return {
      ...habitat,
      visitor: null,
      lastVisitorId: habitat.visitor.id,
      rollInMs: VISIT.rollIntervalMs,
    };
  }

  let rollInMs = habitat.rollInMs - dtMs;
  // 离线很久时可能积累了多次判定机会，这里只结算一次 ——
  // 否则放置一天回来会一连串来十几只，反而失去惊喜感
  if (rollInMs > 0) return { ...habitat, rollInMs };

  const rand = mulberry32(habitat.seed);
  const roll = rand();
  const pickRoll = rand();
  const stayRoll = rand();
  const nextSeed = Math.floor(rand() * 0xffffffff) >>> 0;

  const placed = habitat.placed;
  const likedCount = PLACEMENT_IDS.filter(
    (id) => placed.includes(id) && VISITOR_IDS.some((v) => VISITORS[v].likes.includes(id)),
  ).length;

  // 摆的东西越对路，来的概率越高
  const chance = Math.min(
    VISIT.baseChance + VISIT.bonusChance,
    VISIT.baseChance + (likedCount / HABITAT_SLOTS) * VISIT.bonusChance * 1.5,
  );

  const base: Habitat = { ...habitat, rollInMs: VISIT.rollIntervalMs, seed: nextSeed };

  if (roll >= chance) return base;

  const id = pickVisitor(placed, habitat.lastVisitorId, () => pickRoll);
  const stay = VISITOR_STAY_MS.min + stayRoll * (VISITOR_STAY_MS.max - VISITOR_STAY_MS.min);

  return { ...base, visitor: { id, remainingMs: stay, photographed: false } };
}
