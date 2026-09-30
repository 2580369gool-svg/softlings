/* ============================================================
   可种子化随机数
   用种子而非 Math.random()，是为了让「同一份存档 + 同一次操作」
   永远得到同一个结果（存档可复现、问题可复现）。
   ============================================================ */

/** mulberry32：32 位种子，输出 [0,1)，速度快、分布够均匀 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** 字符串 → 32 位整数种子（FNV-1a） */
export function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 生成短期唯一 id（宠物 id 等，不需要密码学强度） */
export function makeId(prefix = "p"): string {
  const t = Date.now().toString(36);
  const r = Math.floor(Math.random() * 0xffffff).toString(36);
  return `${prefix}_${t}${r}`;
}
