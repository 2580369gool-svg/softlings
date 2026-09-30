/* ============================================================
   小游戏通用类型
   每个游戏只负责「玩法本身」：接收 onFinish，在结束时把分数交出去。
   计时、计分、金币结算、种族加成、退出确认全部由 MiniGameShell 处理。
   ============================================================ */

import type { Species } from "../core/types";

export type GameId =
  | "catchFruit"
  | "bubblePop"
  | "rhythmTap"
  | "rockPaperScissors"
  | "fishing"
  | "memoryMatch";

/**
 * 游戏组件的契约。
 *
 * 外壳统一持有分数和计时器，游戏只负责报告「加减了多少分」——
 * 这样每个游戏不用各写一遍 HUD，也不会出现有的游戏算错分的情况。
 */
export interface GameProps {
  /** 加减分，由外壳累计 */
  onScore: (delta: number) => void;
  /** 当前分数。回合制游戏需要读它来判断胜负或提前收场 */
  score: number;
  /** 游戏自己判定这一局结束了（回合制用），计时类游戏不需要调 */
  onEarlyFinish: () => void;
  /** 玩家主动退出，本局不计分 */
  onQuit: () => void;
}

export interface GameDef {
  id: GameId;
  /** 默认时长（ms）。回合制的游戏可以设得长一些 */
  durationMs: number;
  /** 天赋种族：该种族玩这个游戏有加成 */
  favoredBy: Species;
}

export const GAMES: Record<GameId, GameDef> = {
  catchFruit: { id: "catchFruit", durationMs: 30_000, favoredBy: "puddly" },
  bubblePop: { id: "bubblePop", durationMs: 30_000, favoredBy: "mochi" },
  rhythmTap: { id: "rhythmTap", durationMs: 28_000, favoredBy: "sprout" },
  rockPaperScissors: { id: "rockPaperScissors", durationMs: 60_000, favoredBy: "mochi" },
  fishing: { id: "fishing", durationMs: 40_000, favoredBy: "cloudpuff" },
  memoryMatch: { id: "memoryMatch", durationMs: 60_000, favoredBy: "sprout" },
};

export const GAME_IDS = Object.keys(GAMES) as GameId[];

/** 校验外部传入的游戏 id（URL 参数、存档等来源都不可信） */
export function isGameId(v: unknown): v is GameId {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(GAMES, v);
}

/**
 * 天赋加成倍率。
 * 刻意只有 1.3 倍 —— 加成应该让玩家「更愿意用本命种族去玩特定游戏」，
 * 而不是「不用对应种族就玩不下去」。
 */
export const SPECIES_BONUS = 1.3;
