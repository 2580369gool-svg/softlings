/* ============================================================
   装扮系统
   四个槽位，同一槽位只能穿一件。
   饰品的实际绘制见 render/accessories.tsx —— 那里会按种族取不同的锚点，
   因为四个种族的头身比例差别很大，用一套坐标会全部错位。
   ============================================================ */

export type AccessorySlot = "hat" | "face" | "neck" | "back";

export type AccessoryId =
  | "strawHat"
  | "beanie"
  | "crown"
  | "glasses"
  | "sunglasses"
  | "scarf"
  | "bowtie"
  | "bell"
  | "backpack"
  | "balloon";

export interface AccessoryDef {
  id: AccessoryId;
  slot: AccessorySlot;
  price: number;
}

export const ACCESSORIES: Record<AccessoryId, AccessoryDef> = {
  // 帽子
  strawHat: { id: "strawHat", slot: "hat", price: 30 },
  beanie: { id: "beanie", slot: "hat", price: 45 },
  crown: { id: "crown", slot: "hat", price: 90 },

  // 面部
  glasses: { id: "glasses", slot: "face", price: 40 },
  sunglasses: { id: "sunglasses", slot: "face", price: 55 },

  // 颈部
  scarf: { id: "scarf", slot: "neck", price: 35 },
  bowtie: { id: "bowtie", slot: "neck", price: 45 },
  bell: { id: "bell", slot: "neck", price: 60 },

  // 背部
  backpack: { id: "backpack", slot: "back", price: 65 },
  balloon: { id: "balloon", slot: "back", price: 70 },
};

export const ACCESSORY_IDS = Object.keys(ACCESSORIES) as AccessoryId[];

export const SLOTS: AccessorySlot[] = ["hat", "face", "neck", "back"];

export function isAccessoryId(v: unknown): v is AccessoryId {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(ACCESSORIES, v);
}

export function accessoriesInSlot(slot: AccessorySlot): AccessoryDef[] {
  return ACCESSORY_IDS.map((id) => ACCESSORIES[id]).filter((a) => a.slot === slot);
}

/** 已穿戴的饰品：槽位 → 饰品 id */
export type Equipped = Partial<Record<AccessorySlot, AccessoryId>>;

/** 穿戴 / 脱下。重复点同一件就脱下来，不需要额外的「取下」按钮。 */
export function toggleEquip(equipped: Equipped, id: AccessoryId): Equipped {
  const slot = ACCESSORIES[id].slot;
  if (equipped[slot] === id) {
    const next = { ...equipped };
    delete next[slot];
    return next;
  }
  return { ...equipped, [slot]: id };
}

/**
 * 把已穿戴的饰品摊平成绘制顺序：
 * 背包/气球 → 围巾 → 眼镜 → 帽子。
 * 顺序错了会出现「帽子被眼镜压住」这种穿帮。
 */
export function equippedList(equipped: Equipped): AccessoryId[] {
  const order: AccessorySlot[] = ["back", "neck", "face", "hat"];
  return order
    .map((slot) => equipped[slot])
    .filter((id): id is AccessoryId => Boolean(id));
}
