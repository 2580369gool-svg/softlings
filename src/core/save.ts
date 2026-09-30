/* ============================================================
   存档层 —— 版本化 + 迁移 + 容错读取
   规则：① 从 v1 就写 schemaVersion；② 只走逐版本迁移链，永不跳版；
        ③ 读取时做数据校验与修复，宁可修好也不要让玩家丢档。
   ============================================================ */

import { CARE_SCORE_INITIAL, HABITAT_SLOTS, NEED_MAX, NEED_MIN, PERSONALITY, VISIT } from "./balance";
import { EVOLUTIONS } from "./evolution";
import {
  createHabitat,
  isPlacementId,
  isVisitorId,
  type Habitat,
  type PlacementId,
  type VisitorStay,
} from "./habitat";
import { isItemId, type Inventory } from "./items";
import { clampNeed } from "./needs";
import { defaultPersonality, stageForExp } from "./pet";
import {
  BENTOS,
  createTravel,
  isBentoId,
  isPostcardId,
  type Travel,
  type TripState,
} from "./travel";
import {
  ACTION_KEYS,
  NEED_KEYS,
  SPECIES,
  STAGES,
  type Collection,
  type Needs,
  type Pet,
  type Personality,
  type SimState,
  type Species,
  type Stage,
} from "./types";
import { ACCESSORIES, isAccessoryId, SLOTS, type Equipped } from "./wardrobe";

export const SAVE_KEY = "softlings.save";
export const BACKUP_KEY = "softlings.save.backup";
/** v2：照护分从累计值改成 0..1 的指数移动平均，并引入蛋阶段与进化线 */
export const CURRENT_SCHEMA = 2;

interface SaveFile {
  schemaVersion: number;
  savedAt: number;
  state: SimState;
}

/* ---------------- 校验与修复 ---------------- */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function numOr(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : fallback;
}

function sanitizeNeeds(raw: unknown): Needs {
  const src = isRecord(raw) ? raw : {};
  const out = {} as Needs;
  for (const key of NEED_KEYS) {
    out[key] = clampNeed(numOr(src[key], 60));
  }
  return out;
}

function sanitizePersonality(raw: unknown, species: Species): Personality {
  const fallback = defaultPersonality(species);
  if (!isRecord(raw)) return fallback;
  const out = {} as Personality;
  for (const key of ACTION_KEYS) {
    const v = numOr(raw[key], fallback[key]);
    // 权重越界会让效用 AI 严重偏向某一行为，必须夹回合法区间
    out[key] = Math.min(PERSONALITY.max, Math.max(PERSONALITY.min, v));
  }
  return out;
}

/** 进化线必须是我们认识的那 12 条之一，否则一律置空回落到种族默认外观 */
function sanitizeEvolution(raw: unknown): string | null {
  return typeof raw === "string" && Object.prototype.hasOwnProperty.call(EVOLUTIONS, raw)
    ? raw
    : null;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** 已穿戴饰品：只保留认识的 id，且槽位必须对得上 */
function sanitizeEquipped(raw: unknown): Equipped {
  if (!isRecord(raw)) return {};
  const out: Equipped = {};
  for (const slot of SLOTS) {
    const id = raw[slot];
    if (isAccessoryId(id) && ACCESSORIES[id].slot === slot) out[slot] = id;
  }
  return out;
}

function sanitizePet(raw: unknown): Pet | null {
  if (!isRecord(raw)) return null;
  const species = oneOf(raw.species, SPECIES, "puddly");
  const exp = Math.max(0, numOr(raw.exp, 0));
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : `pet_${Date.now().toString(36)}`,
    species,
    name: typeof raw.name === "string" ? raw.name : "",
    stage: oneOf<Stage>(raw.stage, STAGES, stageForExp(exp)),
    bornAt: numOr(raw.bornAt, Date.now()),
    exp,
    needs: sanitizeNeeds(raw.needs),
    sleeping: raw.sleeping === true,
    // 照护分是 0..1 的均值，越界说明数据不对，回落到中性值
    careScore: clamp01(numOr(raw.careScore, CARE_SCORE_INITIAL)),
    evolution: sanitizeEvolution(raw.evolution),
    hatchProgress: clamp01(numOr(raw.hatchProgress, 1)),
    personality: sanitizePersonality(raw.personality, species),
    accessories: sanitizeEquipped(raw.accessories),
  };
}

/** 院子：格子数量固定，摆件 id 必须认识，访客必须认识 */
function sanitizeHabitat(raw: unknown): Habitat {
  const fallback = createHabitat();
  if (!isRecord(raw)) return fallback;

  const placedRaw = Array.isArray(raw.placed) ? raw.placed : [];
  const placed: (PlacementId | null)[] = Array.from(
    { length: HABITAT_SLOTS },
    (_, i) => {
      const v = placedRaw[i];
      return isPlacementId(v) ? v : null;
    },
  );

  let visitor: VisitorStay | null = null;
  if (isRecord(raw.visitor) && isVisitorId(raw.visitor.id)) {
    visitor = {
      id: raw.visitor.id,
      remainingMs: Math.max(0, numOr(raw.visitor.remainingMs, 0)),
      photographed: raw.visitor.photographed === true,
    };
  }

  return {
    placed,
    visitor,
    rollInMs: Math.max(0, numOr(raw.rollInMs, VISIT.rollIntervalMs)),
    lastVisitorId: isVisitorId(raw.lastVisitorId) ? raw.lastVisitorId : null,
    seed: Math.floor(numOr(raw.seed, Date.now())) >>> 0,
  };
}

function sanitizeCollection(raw: unknown): Collection {
  if (!isRecord(raw)) return { accessories: [], placements: [], visitors: [] };
  return {
    accessories: Array.isArray(raw.accessories) ? raw.accessories.filter(isAccessoryId) : [],
    placements: Array.isArray(raw.placements) ? raw.placements.filter(isPlacementId) : [],
    visitors: Array.isArray(raw.visitors) ? raw.visitors.filter(isVisitorId) : [],
  };
}

function sanitizeTravel(raw: unknown): Travel {
  const fallback = createTravel();
  if (!isRecord(raw)) return fallback;

  const postcards = Array.isArray(raw.postcards) ? raw.postcards.filter(isPostcardId) : [];
  const tripCount = Math.max(0, Math.floor(numOr(raw.tripCount, 0)));

  let active: TripState | null = null;
  if (isRecord(raw.active) && isBentoId(raw.active.bento)) {
    const bento = raw.active.bento;
    active = {
      bento,
      remainingMs: Math.max(0, numOr(raw.active.remainingMs, 0)),
      totalMs: Math.max(1, numOr(raw.active.totalMs, BENTOS[bento].durationMs)),
      seed: Math.floor(numOr(raw.active.seed, Date.now())) >>> 0,
    };
  }

  return { active, postcards, tripCount };
}

/** 背包：只保留认识的道具 id，数量取非负整数 */
function sanitizeInventory(raw: unknown): Inventory {
  if (!isRecord(raw)) return {};
  const out: Inventory = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!isItemId(key)) continue;
    const n = Math.floor(numOr(value, 0));
    if (n > 0) out[key] = Math.min(999, n);
  }
  return out;
}

function sanitizeState(raw: unknown): SimState | null {
  if (!isRecord(raw)) return null;

  const pet = sanitizePet(raw.pet);
  if (!pet) return null;

  const clockRaw = isRecord(raw.clock) ? raw.clock : {};
  const economyRaw = isRecord(raw.economy) ? raw.economy : {};

  const lastTickAt = numOr(clockRaw.lastTickAt, Date.now());

  return {
    pet,
    clock: {
      // 时间戳若来自未来（改过系统时间），夹回当前时刻，防止结算出负数
      lastTickAt: Math.min(lastTickAt, Date.now()),
      totalPlayedMs: Math.max(0, numOr(clockRaw.totalPlayedMs, 0)),
    },
    economy: {
      coins: Math.max(0, numOr(economyRaw.coins, 50)),
      items: sanitizeInventory(economyRaw.items),
      gameCoinsToday: Math.max(0, numOr(economyRaw.gameCoinsToday, 0)),
      gameCoinDay: typeof economyRaw.gameCoinDay === "string" ? economyRaw.gameCoinDay : "",
    },
    // habitat / collection / travel 都是后续版本新增的。它们全部带默认值，
    // 所以老存档直接读不会缺字段，不需要为此升 schemaVersion。
    habitat: sanitizeHabitat(raw.habitat),
    collection: sanitizeCollection(raw.collection),
    travel: sanitizeTravel(raw.travel),
    // lastTrip 是瞬态数据，刻意不持久化：读档时清空，
    // 避免同一次归来的奖励弹窗在重启后再弹一遍
    lastTrip: null,
  };
}

/* ---------------- 迁移链 ---------------- */

/**
 * v1 → v2
 * v1 的 careScore 是「累计值」（可能上百），v2 改成了 0..1 的指数移动平均。
 * 两者量纲完全不同、无法换算，所以重置成中性值，让后续几天的照护
 * 重新决定进化路线 —— 这比强行折算出错误结论要好。
 * v1 也没有蛋阶段，视为已孵化。
 */
function migrateV1toV2(state: unknown): unknown {
  if (!isRecord(state) || !isRecord(state.pet)) return state;
  return {
    ...state,
    pet: {
      ...state.pet,
      careScore: CARE_SCORE_INITIAL,
      evolution: null,
      hatchProgress: 1,
    },
  };
}

/** 逐版本升级。新增版本时在这里追加一段，永远不要改写旧分支。 */
function migrate(file: SaveFile): SimState | null {
  let version = numOr(file.schemaVersion, 0);
  let state: unknown = file.state;

  if (version === 1) {
    state = migrateV1toV2(state);
    version = 2;
  }

  if (version > CURRENT_SCHEMA) {
    // 存档来自更新的客户端版本，拒绝读取以免损坏
    console.warn("[save] 存档版本高于当前客户端，已忽略");
    return null;
  }

  return sanitizeState(state);
}

/* ---------------- 读写 ---------------- */

function readKey(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function loadSave(): SimState | null {
  const primary = readKey(SAVE_KEY);
  if (isRecord(primary) && "schemaVersion" in primary) {
    const restored = migrate(primary as unknown as SaveFile);
    if (restored) return restored;
  }

  // 主存档坏了就退回备份，宁可回滚一版也不要让玩家从头开始
  const backup = readKey(BACKUP_KEY);
  if (isRecord(backup) && "schemaVersion" in backup) {
    console.warn("[save] 主存档不可用，已从备份恢复");
    return migrate(backup as unknown as SaveFile);
  }

  return null;
}

/**
 * 写入存档。
 * 先把当前主存档挪到备份位，再写新的 —— 任何一步失败都还有上一份可用，
 * 避免写一半崩溃产生「半截存档」把玩家的宠物弄丢。
 */
export function persist(state: SimState): void {
  try {
    const payload: SaveFile = {
      schemaVersion: CURRENT_SCHEMA,
      savedAt: Date.now(),
      state,
    };
    const json = JSON.stringify(payload);

    const previous = localStorage.getItem(SAVE_KEY);
    if (previous) localStorage.setItem(BACKUP_KEY, previous);

    localStorage.setItem(SAVE_KEY, json);
  } catch (err) {
    // 配额满 / 隐私模式：不阻断游戏，只记录
    console.warn("[save] 写入失败", err);
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(BACKUP_KEY);
  } catch {
    /* 忽略 */
  }
}

export function hasSave(): boolean {
  return loadSave() !== null;
}

export { NEED_MIN, NEED_MAX };
