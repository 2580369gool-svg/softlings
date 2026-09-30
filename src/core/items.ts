/* ============================================================
   道具与经济
   金币的两个出口：小游戏赚币 → 商店买道具 → 道具强化互动。
   这条链让「玩小游戏」这件事和「照顾宠物」产生因果关系，
   而不是两个各自独立的模块。
   ============================================================ */

import type { ActionKey, NeedKey } from "./types";

export type ItemId = "snack" | "dessert" | "bubbleBath" | "toyBall";

export interface ItemDef {
  id: ItemId;
  price: number;
  /** 使用后对需求的影响 */
  effects: Partial<Record<NeedKey, number>>;
  /**
   * 关联动作 —— 使用道具同样会强化性格。
   * 一直喂甜点的玩家，会养出一只更爱吃甜食的宠物，这条链要接上。
   */
  relatedAction: ActionKey;
  /** 给的经验值 */
  exp: number;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  snack: {
    id: "snack",
    price: 6,
    effects: { satiety: 14, mood: 4 },
    relatedAction: "feed",
    exp: 4,
  },
  dessert: {
    id: "dessert",
    price: 16,
    effects: { satiety: 24, mood: 20 },
    relatedAction: "feed",
    exp: 12,
  },
  bubbleBath: {
    id: "bubbleBath",
    price: 20,
    effects: { cleanliness: 48, mood: 10, energy: -4 },
    relatedAction: "bathe",
    exp: 14,
  },
  toyBall: {
    id: "toyBall",
    price: 24,
    effects: { mood: 30, energy: 6, cleanliness: -8 },
    relatedAction: "play",
    exp: 18,
  },
};

export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];

export function isItemId(v: unknown): v is ItemId {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(ITEMS, v);
}

/** 背包：道具 id → 数量 */
export type Inventory = Partial<Record<ItemId, number>>;

export function inventoryCount(inv: Inventory, id: ItemId): number {
  return inv[id] ?? 0;
}

/* ---------------- 小游戏收益 ---------------- */

/**
 * 小游戏分数换算成金币。
 *
 * 定标依据：一次 30 秒的小游戏应该能买得起 1–2 个便宜道具（6–16 币），
 * 或者攒两次买一个贵道具（24 币）。
 * 定太高会让互动奖励（经验折币）变得毫无意义，定太低则没人愿意玩。
 */
export const COIN_PER_POINT = 1.1;

/** 保底奖励：玩得再差也不该空手而归，否则挫败感太强 */
export const MIN_GAME_COINS = 5;

/** 每天通过小游戏能拿到的金币上限 —— 防止玩家刷小游戏绕过照护 */
export const DAILY_GAME_COIN_CAP = 260;

export function coinsForScore(score: number): number {
  return Math.max(MIN_GAME_COINS, Math.round(score * COIN_PER_POINT));
}

/** 本地日期键（YYYY-M-D），用于每日上限的重置判断 */
export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * 按每日上限裁切本次小游戏收益。
 * 单独抽成纯函数是为了能被测试 —— 这段逻辑一旦写错，
 * 要么玩家刷币绕过照护，要么明明该给钱却不给，两种都很难在人工试玩时发现。
 */
export function applyDailyCap(
  earnedToday: number,
  coins: number,
): { awarded: number; capped: boolean } {
  const remaining = Math.max(0, DAILY_GAME_COIN_CAP - Math.max(0, earnedToday));
  const awarded = Math.max(0, Math.min(coins, remaining));
  return { awarded, capped: awarded < coins };
}
