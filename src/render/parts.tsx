/* ============================================================
   装饰部件库
   12 条进化线不是 12 张手绘图，而是这些部件的组合结果。

   每个部件声明自己属于哪一层，渲染器据此决定插入位置：
     behind  → 身体之前（翅膀、尾巴、光环，要露在身体外面）
     pattern → 身体之后、五官之前（斑纹、裂纹、闪粉，贴在皮肤上）
     top     → 五官之后（头顶的花、角、火焰，要盖住一切）
   层次搞错就会出现「条纹画到眼睛上」这种穿帮。
   ============================================================ */

import type { ReactNode } from "react";

import type { PartId } from "../core/evolution";

const INK = "#4A3B63";

export type PartLayer = "behind" | "pattern" | "top";

export const PART_LAYER: Record<PartId, PartLayer> = {
  wingSmall: "behind",
  wingButterfly: "behind",
  wingBat: "behind",
  halo: "behind",
  tailPuff: "behind",
  tailFlame: "behind",
  rainbowArc: "behind",

  tigerStripes: "pattern",
  magmaCracks: "pattern",
  starMark: "pattern",
  jellySparkle: "pattern",

  caramelDrip: "top",
  strawberry: "top",
  crescentMoon: "top",
  blossomCrown: "top",
  crystalHorn: "top",
  flameTuft: "top",
  stormCloud: "top",
  rainbowTuft: "top",
};

/** 四角星 —— 闪粉/星星装饰的基本单元 */
function sparkle(x: number, y: number, r: number, fill: string, opacity = 1) {
  return (
    <path
      key={`sp-${x}-${y}`}
      d={`M${x} ${y - r} Q${x + r * 0.22} ${y - r * 0.22} ${x + r} ${y} Q${x + r * 0.22} ${y + r * 0.22} ${x} ${y + r} Q${x - r * 0.22} ${y + r * 0.22} ${x - r} ${y} Q${x - r * 0.22} ${y - r * 0.22} ${x} ${y - r} Z`}
      fill={fill}
      opacity={opacity}
    />
  );
}

/** 五瓣小花 —— 花冠的基本单元 */
function blossom(x: number, y: number, r: number, petal: string, core: string) {
  const petals = [0, 72, 144, 216, 288].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return (
      <circle
        key={deg}
        cx={x + Math.cos(rad) * r * 0.72}
        cy={y + Math.sin(rad) * r * 0.72}
        r={r * 0.58}
        fill={petal}
      />
    );
  });
  return (
    <g key={`bl-${x}-${y}`}>
      {petals}
      <circle cx={x} cy={y} r={r * 0.44} fill={core} />
    </g>
  );
}

export const PARTS: Record<PartId, (accent: string) => ReactNode> = {
  /* ================= 身后层 ================= */

  wingSmall: (accent) => (
    <g key="wingSmall" fill={accent} stroke={INK} strokeWidth="2.6" strokeLinejoin="round">
      <path d="M40 100 C12 80 2 100 14 114 C2 120 10 138 32 128 Z" />
      <path d="M160 100 C188 80 198 100 186 114 C198 120 190 138 168 128 Z" />
    </g>
  ),

  wingButterfly: (accent) => (
    <g key="wingButterfly" fill={accent} stroke={INK} strokeWidth="2.6" strokeLinejoin="round">
      <path d="M46 102 C6 74 -6 104 14 116 C-8 118 2 148 34 134 C40 128 46 116 46 102 Z" opacity=".95" />
      <path d="M154 102 C194 74 206 104 186 116 C208 118 198 148 166 134 C160 128 154 116 154 102 Z" opacity=".95" />
    </g>
  ),

  wingBat: (accent) => (
    <g key="wingBat" fill={accent} stroke={INK} strokeWidth="2.6" strokeLinejoin="round">
      <path d="M44 98 L4 84 L14 104 L0 108 L20 120 L10 136 L36 130 Z" />
      <path d="M156 98 L196 84 L186 104 L200 108 L180 120 L190 136 L164 130 Z" />
    </g>
  ),

  halo: (accent) => (
    <g key="halo">
      <ellipse
        cx="100"
        cy="24"
        rx="34"
        ry="9"
        fill="none"
        stroke={accent}
        strokeWidth="6"
        opacity=".95"
      />
      <ellipse cx="100" cy="24" rx="34" ry="9" fill="none" stroke="#fff" strokeWidth="2" opacity=".6" />
    </g>
  ),

  tailPuff: (accent) => (
    <g key="tailPuff" fill={accent} stroke={INK} strokeWidth="2.6" strokeLinejoin="round">
      <circle cx="172" cy="136" r="18" />
      <circle cx="186" cy="120" r="13" />
      <circle cx="188" cy="146" r="12" />
    </g>
  ),

  tailFlame: (accent) => (
    <g key="tailFlame">
      <path
        d="M164 140 C186 132 196 108 188 88 C186 106 178 116 168 118 C176 106 176 92 168 82 C168 100 160 114 152 122 C156 132 160 138 164 140 Z"
        fill={accent}
        stroke={INK}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M168 132 C178 124 182 110 178 98 C176 110 170 118 164 122 Z" fill="#FFE9A8" opacity=".8" />
    </g>
  ),

  rainbowArc: (accent) => (
    <g key="rainbowArc" fill="none" strokeLinecap="round" opacity=".9">
      <path d="M22 168 A78 78 0 0 1 178 168" stroke="#FF6B9D" strokeWidth="9" />
      <path d="M32 168 A68 68 0 0 1 168 168" stroke="#FFA45B" strokeWidth="9" />
      <path d="M42 168 A58 58 0 0 1 158 168" stroke="#FFE66D" strokeWidth="9" />
      <path d="M52 168 A48 48 0 0 1 148 168" stroke="#4ECDC4" strokeWidth="9" />
      <path d="M62 168 A38 38 0 0 1 138 168" stroke={accent} strokeWidth="9" />
    </g>
  ),

  /* ================= 皮肤层 ================= */

  tigerStripes: (accent) => (
    <g key="tigerStripes" stroke={accent} strokeWidth="5" strokeLinecap="round" fill="none" opacity=".85">
      <path d="M62 92 l10 12" />
      <path d="M54 118 l12 10" />
      <path d="M138 92 l-10 12" />
      <path d="M146 118 l-12 10" />
      <path d="M70 148 l8 8" />
      <path d="M130 148 l-8 8" />
    </g>
  ),

  magmaCracks: (accent) => (
    <g key="magmaCracks" strokeLinecap="round" fill="none">
      <g stroke={accent} strokeWidth="6" opacity=".35">
        <path d="M66 92 l10 16 l-7 12 l12 18" />
        <path d="M138 96 l-11 15 l8 13 l-13 17" />
      </g>
      <g stroke="#FFF0C2" strokeWidth="2.6">
        <path d="M66 92 l10 16 l-7 12 l12 18" />
        <path d="M138 96 l-11 15 l8 13 l-13 17" />
      </g>
    </g>
  ),

  starMark: (accent) => (
    <g key="starMark">
      {sparkle(66, 118, 8, accent, 0.95)}
      {sparkle(136, 150, 6, accent, 0.85)}
      {sparkle(112, 96, 5, "#FFFFFF", 0.9)}
    </g>
  ),

  jellySparkle: (accent) => (
    <g key="jellySparkle">
      {sparkle(72, 104, 9, accent, 0.95)}
      {sparkle(124, 142, 7, accent, 0.9)}
      {sparkle(96, 146, 5, "#FFFFFF", 0.9)}
      {sparkle(142, 100, 6, "#FFFFFF", 0.85)}
    </g>
  ),

  /* ================= 头顶层 ================= */

  caramelDrip: (accent) => (
    <g key="caramelDrip" fill={accent} stroke={INK} strokeWidth="2.4" strokeLinejoin="round">
      <path d="M52 62 C62 36 138 36 148 62 C148 62 140 70 100 70 C60 70 52 62 52 62 Z" />
      <ellipse cx="72" cy="80" rx="9" ry="17" />
      <ellipse cx="104" cy="88" rx="8" ry="22" />
      <ellipse cx="134" cy="78" rx="7" ry="15" />
    </g>
  ),

  strawberry: (accent) => (
    <g key="strawberry">
      <path d="M88 30 L100 14 L112 30 Z" fill="#6FC96C" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <path
        d="M100 24 C114 24 122 36 122 48 C122 60 111 68 100 68 C89 68 78 60 78 48 C78 36 86 24 100 24 Z"
        fill={accent}
        stroke={INK}
        strokeWidth="2.4"
      />
      {[
        [92, 40],
        [108, 40],
        [100, 50],
        [92, 58],
        [108, 58],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.7" fill="#FFF3B0" />
      ))}
    </g>
  ),

  crescentMoon: (accent) => (
    <g key="crescentMoon">
      <path
        d="M104 22 C118 26 126 40 122 54 C118 68 102 76 88 70 C102 68 112 56 112 42 C112 34 109 27 104 22 Z"
        fill={accent}
        stroke={INK}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {sparkle(134, 40, 6, "#FFFFFF", 0.95)}
      {sparkle(74, 34, 4.5, "#FFFFFF", 0.8)}
    </g>
  ),

  blossomCrown: (accent) => (
    <g key="blossomCrown">
      {blossom(74, 46, 13, accent, "#FFE66D")}
      {blossom(100, 30, 15, "#FFFFFF", "#FFE66D")}
      {blossom(126, 46, 13, accent, "#FFE66D")}
      <path d="M74 46 Q100 58 126 46" stroke="#6FC96C" strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  ),

  crystalHorn: (accent) => (
    <g key="crystalHorn" stroke={INK} strokeWidth="2.4" strokeLinejoin="round">
      <path d="M100 8 L114 34 L100 62 L86 34 Z" fill={accent} />
      <path d="M100 8 L100 62 M86 34 L114 34" stroke="#FFFFFF" strokeWidth="1.8" opacity=".75" />
      <path d="M86 34 L100 8 L100 62 Z" fill="#FFFFFF" opacity=".22" />
    </g>
  ),

  flameTuft: (accent) => (
    <g key="flameTuft">
      <path
        d="M100 6 C114 24 126 34 122 50 C118 62 108 66 100 62 C92 66 82 62 78 50 C74 34 86 24 100 6 Z"
        fill={accent}
        stroke={INK}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M100 22 C108 34 114 40 111 50 C108 57 103 58 100 56 C97 58 92 57 89 50 C86 40 92 34 100 22 Z" fill="#FFE9A8" opacity=".9" />
    </g>
  ),

  stormCloud: (accent) => (
    <g key="stormCloud">
      <g fill={accent} stroke={INK} strokeWidth="2.4" strokeLinejoin="round">
        <circle cx="80" cy="46" r="15" />
        <circle cx="100" cy="38" r="18" />
        <circle cx="120" cy="46" r="15" />
        <rect x="66" y="42" width="68" height="18" rx="9" />
      </g>
      {/* 闪电 */}
      <path d="M98 64 L88 84 L98 82 L90 100 L110 78 L100 80 L108 64 Z" fill="#FFE066" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
    </g>
  ),

  rainbowTuft: (accent) => (
    <g key="rainbowTuft">
      <path d="M76 44 C78 22 92 12 100 12 C108 12 122 22 124 44 Z" fill="#FF6B9D" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M84 44 C86 28 94 20 100 20 C106 20 114 28 116 44 Z" fill="#FFE66D" />
      <path d="M92 44 C93 34 96 28 100 28 C104 28 107 34 108 44 Z" fill="#4ECDC4" />
      {sparkle(64, 56, 6, accent, 0.9)}
      {sparkle(138, 52, 5, "#FFFFFF", 0.85)}
    </g>
  ),
};
