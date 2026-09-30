/* ============================================================
   种族基础配色
   单独成文件是为了让「蛋」「破壳演出」等组件也能取到宠物主色，
   而不必把 PetSvg 内部的绘制表暴露出去。
   ============================================================ */

import type { Species } from "../core/types";

export interface SpeciesPalette {
  /** 主体色 */
  color: string;
  /** 暗部 */
  shade: string;
  /** 腮红 */
  blush: string;
}

export const SPECIES_BASE: Record<Species, SpeciesPalette> = {
  puddly: { color: "#FFD98E", shade: "#F2B95C", blush: "#FF6B9D" },
  mochi: { color: "#FFF3E4", shade: "#EBD9C4", blush: "#FF8FB1" },
  cloudpuff: { color: "#E8F6FF", shade: "#CBE6F7", blush: "#FFA6C9" },
  sprout: { color: "#C9F2C7", shade: "#A6DFA4", blush: "#FF9EC4" },

  // M9 新增
  whispy: { color: "#E4E8FF", shade: "#BFC7F0", blush: "#FFA6C9" },
  twinkle: { color: "#FFF0B8", shade: "#F2D06A", blush: "#FF9EC4" },
};
