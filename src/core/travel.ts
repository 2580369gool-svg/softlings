/* ============================================================
   旅行与明信片
   抄《旅行青蛙》的核心：准备行囊 → 它自己出门 → 随机归来 → 带回明信片。

   与主循环的共存方式：由玩家主动派出，而不是宠物自己走掉。
   原因是主循环（需求/性格/进化）全挂在宠物身上，
   它要是自己走了，玩家就没得玩了。主动派出把「等待」变成一种
   玩家的选择，而不是被打断。

   一次旅行的完整情绪曲线：准备（选便当）→ 送走 → 牵挂 → 归来开箱。
   明信片是这条曲线的收尾奖励。
   ============================================================ */

import { mulberry32 } from "./rng";

/* ---------------- 便当（行囊） ---------------- */

export type BentoId = "riceBall" | "bento" | "feast";

export interface BentoDef {
  id: BentoId;
  price: number;
  /** 出行时长（ms） */
  durationMs: number;
  /** 归来带回的明信片数量区间 */
  rolls: [number, number];
  /** 稀有度权重 */
  weights: { common: number; rare: number; legendary: number };
}

/**
 * 三种行囊。
 * 定价与时长刻意做成「越贵越久」—— 长的旅行要等更久，但带回来的东西更好，
 * 这是一个真取舍，而不是「贵的就是好的」。
 */
export const BENTOS: Record<BentoId, BentoDef> = {
  riceBall: {
    id: "riceBall",
    price: 15,
    durationMs: 30 * 60_000,
    rolls: [1, 2],
    weights: { common: 0.88, rare: 0.12, legendary: 0 },
  },
  bento: {
    id: "bento",
    price: 40,
    durationMs: 90 * 60_000,
    rolls: [2, 3],
    weights: { common: 0.62, rare: 0.33, legendary: 0.05 },
  },
  feast: {
    id: "feast",
    price: 90,
    durationMs: 180 * 60_000,
    rolls: [2, 4],
    weights: { common: 0.4, rare: 0.42, legendary: 0.18 },
  },
};

export const BENTO_IDS = Object.keys(BENTOS) as BentoId[];

export function isBentoId(v: unknown): v is BentoId {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(BENTOS, v);
}

/* ---------------- 明信片 ---------------- */

export type Rarity = "common" | "rare" | "legendary";

export type PostcardId =
  | "beach"
  | "forest"
  | "flowerField"
  | "lake"
  | "bamboo"
  | "snowMountain"
  | "sakura"
  | "desert"
  | "starrySky"
  | "volcano"
  | "aurora"
  | "seaOfClouds";

export interface PostcardDef {
  id: PostcardId;
  rarity: Rarity;
  /** 首次收集的金币奖励 */
  coins: number;
}

export const POSTCARDS: Record<PostcardId, PostcardDef> = {
  // 常见：走得近，当天来回
  beach: { id: "beach", rarity: "common", coins: 22 },
  forest: { id: "forest", rarity: "common", coins: 22 },
  flowerField: { id: "flowerField", rarity: "common", coins: 24 },
  lake: { id: "lake", rarity: "common", coins: 24 },
  bamboo: { id: "bamboo", rarity: "common", coins: 26 },

  // 稀有：要走远一点
  snowMountain: { id: "snowMountain", rarity: "rare", coins: 55 },
  sakura: { id: "sakura", rarity: "rare", coins: 58 },
  desert: { id: "desert", rarity: "rare", coins: 60 },
  starrySky: { id: "starrySky", rarity: "rare", coins: 62 },

  // 传说：得靠运气
  volcano: { id: "volcano", rarity: "legendary", coins: 130 },
  aurora: { id: "aurora", rarity: "legendary", coins: 140 },
  seaOfClouds: { id: "seaOfClouds", rarity: "legendary", coins: 150 },
};

export const POSTCARD_IDS = Object.keys(POSTCARDS) as PostcardId[];

export function isPostcardId(v: unknown): v is PostcardId {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(POSTCARDS, v);
}

export function postcardsOfRarity(rarity: Rarity): PostcardId[] {
  return POSTCARD_IDS.filter((id) => POSTCARDS[id].rarity === rarity);
}

/* ---------------- 出行状态 ---------------- */

export interface TripState {
  bento: BentoId;
  /** 距离归来还有多久 —— 用剩余时长，离线推进才能自然生效 */
  remainingMs: number;
  /** 这次出行总共要多久，用于算进度条 */
  totalMs: number;
  seed: number;
}

export interface Travel {
  /** 正在旅行时为非空 */
  active: TripState | null;
  /** 已收集的明信片 */
  postcards: PostcardId[];
  /** 累计出行次数 */
  tripCount: number;
}

export interface TripReward {
  postcards: PostcardId[];
  /** 本次新收集到的（用于弹窗展示） */
  newPostcards: PostcardId[];
  coins: number;
}

export function createTravel(): Travel {
  return { active: null, postcards: [], tripCount: 0 };
}

/* ---------------- 出发条件 ---------------- */

/** 出门前的最低状态要求 —— 状态太差就不该放它出去 */
export const DEPART_REQUIREMENTS = {
  satiety: 40,
  mood: 45,
  energy: 35,
} as const;

/**
 * 判断能不能出门，返回不满足的条件。
 * 返回数组而不是布尔值，是为了让 UI 能直接告诉玩家「它现在太累了」，
 * 而不是只给一个灰掉的按钮。
 */
export function departBlockers(pet: {
  needs: Record<keyof typeof DEPART_REQUIREMENTS, number>;
}): (keyof typeof DEPART_REQUIREMENTS)[] {
  return (Object.keys(DEPART_REQUIREMENTS) as (keyof typeof DEPART_REQUIREMENTS)[]).filter(
    (k) => pet.needs[k] < DEPART_REQUIREMENTS[k],
  );
}

/* ---------------- 归来结算 ---------------- */

/** 按权重抽一个稀有度 */
function rollRarity(weights: BentoDef["weights"], r: number): Rarity {
  if (r < weights.common) return "common";
  if (r < weights.common + weights.rare) return "rare";
  return "legendary";
}

/** 结算一次旅行：抽出带回来的明信片 */
export function resolveTrip(
  trip: TripState,
  owned: PostcardId[],
): TripReward {
  const def = BENTOS[trip.bento];
  const rand = mulberry32(trip.seed);

  const [lo, hi] = def.rolls;
  const count = lo + Math.floor(rand() * (hi - lo + 1));

  const postcards: PostcardId[] = [];
  let coins = 0;

  for (let i = 0; i < count; i++) {
    const rarity = rollRarity(def.weights, rand());
    const pool = postcardsOfRarity(rarity);
    const pick = pool[Math.floor(rand() * pool.length)];
    if (!pick) continue;

    postcards.push(pick);
    // 重复的照片也给钱，只是少一些 —— 不能让「重复」变成纯粹的挫败
    coins += owned.includes(pick) ? Math.round(POSTCARDS[pick].coins * 0.3) : POSTCARDS[pick].coins;
  }

  const newPostcards = postcards.filter((id) => !owned.includes(id));

  return { postcards, newPostcards, coins };
}

/**
 * 推进旅行。
 * @returns 新的旅行状态；若这一帧正好归来，arrived 为本次的结算结果
 */
export function stepTravel(
  travel: Travel,
  dtMs: number,
): { travel: Travel; arrived: TripReward | null } {
  const trip = travel.active;
  if (!trip || dtMs <= 0) return { travel, arrived: null };

  const remaining = trip.remainingMs - dtMs;
  if (remaining > 0) {
    return { travel: { ...travel, active: { ...trip, remainingMs: remaining } }, arrived: null };
  }

  const reward = resolveTrip(trip, travel.postcards);
  const merged = [...travel.postcards];
  for (const id of reward.newPostcards) {
    if (!merged.includes(id)) merged.push(id);
  }

  return {
    travel: {
      active: null,
      postcards: merged,
      tripCount: travel.tripCount + 1,
    },
    arrived: reward,
  };
}

/** 把一批新明信片并入收藏 */
export function mergePostcards(owned: PostcardId[], incoming: PostcardId[]): PostcardId[] {
  const out = [...owned];
  for (const id of incoming) if (!out.includes(id)) out.push(id);
  return out;
}
