/* ============================================================
   饰品绘制
   四个种族的头身比例差别很大（云朵羊头顶有绒毛、芽芽龙头顶有嫩芽、
   麻薯猫有耳朵），所以每件饰品都要按种族取锚点，不能共用一套坐标。
   ============================================================ */

import type { ReactNode } from "react";

import type { AccessoryId } from "../core/wardrobe";
import type { Species } from "../core/types";

const INK = "#4A3B63";

interface Vec {
  x: number;
  y: number;
}

export interface AccessoryAnchors {
  hat: Vec;
  face: Vec;
  neck: Vec;
  back: Vec;
  /** 整体缩放，用于适配不同体型的头宽 */
  scale: number;
}

export const ANCHORS: Record<Species, AccessoryAnchors> = {
  puddly: {
    hat: { x: 100, y: 36 },
    face: { x: 100, y: 104 },
    neck: { x: 100, y: 150 },
    back: { x: 142, y: 126 },
    scale: 1,
  },
  mochi: {
    // 猫的耳朵在 y24–72，帽子往上挪一点，戴在两耳之间才不会压住耳朵
    hat: { x: 100, y: 34 },
    face: { x: 100, y: 106 },
    neck: { x: 100, y: 152 },
    back: { x: 144, y: 130 },
    scale: 1,
  },
  cloudpuff: {
    // 头顶有一撮绒毛，帽子再抬高一些
    hat: { x: 100, y: 26 },
    face: { x: 100, y: 108 },
    neck: { x: 100, y: 154 },
    back: { x: 146, y: 128 },
    scale: 1.04,
  },
  sprout: {
    hat: { x: 100, y: 40 },
    face: { x: 100, y: 110 },
    neck: { x: 100, y: 156 },
    back: { x: 146, y: 132 },
    scale: 0.98,
  },
  whispy: {
    // 幽灵的「脖子」在波浪下摆之上，项圈要抬高一点才不会被浪花吃掉
    hat: { x: 100, y: 44 },
    face: { x: 100, y: 104 },
    neck: { x: 100, y: 142 },
    back: { x: 146, y: 124 },
    scale: 1,
  },
  twinkle: {
    // 星形的可用中心比圆形小，饰品整体内收一档
    hat: { x: 100, y: 30 },
    face: { x: 100, y: 100 },
    neck: { x: 100, y: 142 },
    back: { x: 148, y: 124 },
    scale: 0.9,
  },
};

/** 围巾/项圈共用的那道弧 */
function collarPath(x: number, y: number, s: number): string {
  return `M${x - 36 * s} ${y} Q${x} ${y + 19 * s} ${x + 36 * s} ${y}`;
}

export type AccessoryRenderer = (a: AccessoryAnchors) => ReactNode;

export const ACCESSORY_ART: Record<AccessoryId, AccessoryRenderer> = {
  /* ---------------- 帽子 ---------------- */

  strawHat: ({ hat: p, scale: s }) => (
    <g key="strawHat">
      <ellipse cx={p.x} cy={p.y + 6 * s} rx={46 * s} ry={12 * s} fill="#F2D08A" stroke={INK} strokeWidth="2.6" />
      <path
        d={`M${p.x - 26 * s} ${p.y + 6 * s} C${p.x - 26 * s} ${p.y - 26 * s} ${p.x + 26 * s} ${p.y - 26 * s} ${p.x + 26 * s} ${p.y + 6 * s} Z`}
        fill="#FFE3A8"
        stroke={INK}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <rect x={p.x - 27 * s} y={p.y - 3 * s} width={54 * s} height={9 * s} rx={4} fill="#FF6B9D" stroke={INK} strokeWidth="2" />
    </g>
  ),

  beanie: ({ hat: p, scale: s }) => (
    <g key="beanie">
      <path
        d={`M${p.x - 30 * s} ${p.y + 8 * s} C${p.x - 30 * s} ${p.y - 28 * s} ${p.x + 30 * s} ${p.y - 28 * s} ${p.x + 30 * s} ${p.y + 8 * s} Z`}
        fill="#C7A0FF"
        stroke={INK}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <rect x={p.x - 33 * s} y={p.y + 1 * s} width={66 * s} height={13 * s} rx={6} fill="#B08CF0" stroke={INK} strokeWidth="2.4" />
      <circle cx={p.x} cy={p.y - 30 * s} r={9 * s} fill="#FFF3B0" stroke={INK} strokeWidth="2.4" />
    </g>
  ),

  crown: ({ hat: p, scale: s }) => (
    <g key="crown">
      <path
        d={`M${p.x - 28 * s} ${p.y + 6 * s} L${p.x - 28 * s} ${p.y - 16 * s} L${p.x - 14 * s} ${p.y - 2 * s} L${p.x} ${p.y - 26 * s} L${p.x + 14 * s} ${p.y - 2 * s} L${p.x + 28 * s} ${p.y - 16 * s} L${p.x + 28 * s} ${p.y + 6 * s} Z`}
        fill="#FFE066"
        stroke={INK}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <circle cx={p.x} cy={p.y - 15 * s} r={3.4 * s} fill="#FF6B9D" />
      <circle cx={p.x - 17 * s} cy={p.y - 6 * s} r={2.6 * s} fill="#4ECDC4" />
      <circle cx={p.x + 17 * s} cy={p.y - 6 * s} r={2.6 * s} fill="#4ECDC4" />
    </g>
  ),

  /* ---------------- 面部 ---------------- */

  glasses: ({ face: p, scale: s }) => (
    <g key="glasses" fill="none" stroke={INK} strokeWidth="2.8">
      <circle cx={p.x - 20 * s} cy={p.y} r={13 * s} fill="rgba(255,255,255,0.5)" />
      <circle cx={p.x + 20 * s} cy={p.y} r={13 * s} fill="rgba(255,255,255,0.5)" />
      <path d={`M${p.x - 7 * s} ${p.y} L${p.x + 7 * s} ${p.y}`} />
      <path d={`M${p.x - 33 * s} ${p.y - 2 * s} L${p.x - 43 * s} ${p.y - 5 * s}`} />
      <path d={`M${p.x + 33 * s} ${p.y - 2 * s} L${p.x + 43 * s} ${p.y - 5 * s}`} />
    </g>
  ),

  sunglasses: ({ face: p, scale: s }) => (
    <g key="sunglasses">
      <rect x={p.x - 34 * s} y={p.y - 11 * s} width={27 * s} height={20 * s} rx={9 * s} fill="#4A3B63" opacity=".88" />
      <rect x={p.x + 7 * s} y={p.y - 11 * s} width={27 * s} height={20 * s} rx={9 * s} fill="#4A3B63" opacity=".88" />
      <path d={`M${p.x - 7 * s} ${p.y - 4 * s} L${p.x + 7 * s} ${p.y - 4 * s}`} stroke={INK} strokeWidth="3" />
      <path d={`M${p.x - 34 * s} ${p.y - 6 * s} L${p.x - 45 * s} ${p.y - 8 * s}`} stroke={INK} strokeWidth="2.8" />
      <path d={`M${p.x + 34 * s} ${p.y - 6 * s} L${p.x + 45 * s} ${p.y - 8 * s}`} stroke={INK} strokeWidth="2.8" />
    </g>
  ),

  /* ---------------- 颈部 ---------------- */

  scarf: ({ neck: p, scale: s }) => (
    <g key="scarf">
      <path d={collarPath(p.x, p.y, s)} stroke={INK} strokeWidth={19 * s} strokeLinecap="round" fill="none" />
      <path d={collarPath(p.x, p.y, s)} stroke="#FF6B9D" strokeWidth={13 * s} strokeLinecap="round" fill="none" />
      <path
        d={`M${p.x + 22 * s} ${p.y + 10 * s} q7 ${16 * s} -2 ${27 * s} l-13 ${-5} q9 ${-10} 4 ${-22 * s} Z`}
        fill="#E85A8A"
        stroke={INK}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </g>
  ),

  bowtie: ({ neck: p, scale: s }) => (
    <g key="bowtie">
      <path
        d={`M${p.x} ${p.y + 6 * s} L${p.x - 26 * s} ${p.y - 7 * s} L${p.x - 26 * s} ${p.y + 19 * s} Z`}
        fill="#4ECDC4"
        stroke={INK}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d={`M${p.x} ${p.y + 6 * s} L${p.x + 26 * s} ${p.y - 7 * s} L${p.x + 26 * s} ${p.y + 19 * s} Z`}
        fill="#4ECDC4"
        stroke={INK}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <circle cx={p.x} cy={p.y + 6 * s} r={6 * s} fill="#3BB5AC" stroke={INK} strokeWidth="2.2" />
    </g>
  ),

  bell: ({ neck: p, scale: s }) => (
    <g key="bell">
      <path d={collarPath(p.x, p.y, s)} stroke={INK} strokeWidth={10 * s} strokeLinecap="round" fill="none" />
      <path d={collarPath(p.x, p.y, s)} stroke="#C7A0FF" strokeWidth={6 * s} strokeLinecap="round" fill="none" />
      <circle cx={p.x} cy={p.y + 20 * s} r={9 * s} fill="#FFE066" stroke={INK} strokeWidth="2.4" />
      <path d={`M${p.x - 8 * s} ${p.y + 23 * s} L${p.x + 8 * s} ${p.y + 23 * s}`} stroke={INK} strokeWidth="2" />
    </g>
  ),

  /* ---------------- 背部 ---------------- */

  backpack: ({ back: p, scale: s }) => (
    <g key="backpack">
      <rect x={p.x - 26 * s} y={p.y - 26 * s} width={52 * s} height={54 * s} rx={14} fill="#FFA45B" stroke={INK} strokeWidth="2.6" />
      <rect x={p.x - 15 * s} y={p.y + 2 * s} width={30 * s} height={18 * s} rx={7} fill="#FFD9B5" stroke={INK} strokeWidth="2.2" />
    </g>
  ),

  balloon: ({ back: p, scale: s }) => (
    <g key="balloon">
      <path
        d={`M${p.x - 6 * s} ${p.y - 96 * s} Q${p.x + 8 * s} ${p.y - 60 * s} ${p.x} ${p.y - 26 * s}`}
        stroke={INK}
        strokeWidth="1.8"
        fill="none"
      />
      <ellipse cx={p.x} cy={p.y - 116 * s} rx={21 * s} ry={25 * s} fill="#FF6B9D" stroke={INK} strokeWidth="2.6" />
      <ellipse cx={p.x - 6 * s} cy={p.y - 124 * s} rx={6 * s} ry={8 * s} fill="#fff" opacity=".55" />
    </g>
  ),
};
