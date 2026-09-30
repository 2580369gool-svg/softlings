/* ============================================================
   野生访客的造型
   全部在 100×100 的 viewBox 里绘制，方便在院子里统一缩放。
   风格刻意比主角宠物更「写实一点点」—— 它们是野生动物，
   和玩家养的那只精致团子要有区分度。
   ============================================================ */

import type { ReactNode } from "react";

import type { VisitorId } from "../core/habitat";

const INK = "#4A3B63";

/** 统一的眼睛画法：实心圆 + 高光，可爱感的命门 */
function eye(cx: number, cy: number, r = 3.6): ReactNode {
  return (
    <g key={`eye-${cx}-${cy}`}>
      <circle cx={cx} cy={cy} r={r} fill={INK} />
      <circle cx={cx + r * 0.32} cy={cy - r * 0.34} r={r * 0.34} fill="#fff" />
    </g>
  );
}

export const VISITOR_ART: Record<VisitorId, ReactNode> = {
  /* 胖麻雀 */
  sparrow: (
    <g>
      <ellipse cx="48" cy="62" rx="30" ry="26" fill="#B08968" stroke={INK} strokeWidth="2.6" />
      <ellipse cx="50" cy="74" rx="19" ry="14" fill="#F5E6D3" opacity=".9" />
      <path d="M26 58 q16 -8 28 4 q-16 10 -28 -4 Z" fill="#8C6A4F" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M76 60 l13 6 l-13 6 Z" fill="#FFA45B" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      {eye(62, 52)}
      <circle cx="52" cy="62" r="4" fill="#FF8FB1" opacity=".55" />
    </g>
  ),

  /* 松鼠 */
  squirrel: (
    <g>
      <path
        d="M78 78 C104 76 104 34 82 28 C92 44 86 60 70 62 Z"
        fill="#C98F5A"
        stroke={INK}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <ellipse cx="48" cy="64" rx="26" ry="24" fill="#D9A06A" stroke={INK} strokeWidth="2.6" />
      <ellipse cx="48" cy="74" rx="16" ry="12" fill="#F5E0C8" opacity=".9" />
      <path d="M30 42 l6 -18 l10 14 Z" fill="#C98F5A" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M58 40 l10 -16 l6 18 Z" fill="#C98F5A" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      {eye(40, 58)}
      {eye(58, 58)}
      <path d="M46 70 q4 4 8 0" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </g>
  ),

  /* 三花猫 */
  calico: (
    <g>
      <path d="M86 76 C98 70 96 52 86 50 C90 62 88 70 80 72 Z" fill="#F0D9B5" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M28 40 l2 -20 l16 12 Z" fill="#FFF3E4" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M62 36 l14 -16 l4 20 Z" fill="#F5A65B" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      <ellipse cx="50" cy="62" rx="28" ry="25" fill="#FFF3E4" stroke={INK} strokeWidth="2.6" />
      <ellipse cx="34" cy="52" rx="10" ry="9" fill="#F5A65B" opacity=".9" />
      <ellipse cx="66" cy="70" rx="11" ry="9" fill="#4A3B63" opacity=".55" />
      {eye(40, 58)}
      {eye(60, 58)}
      <path d="M46 70 q4 3 8 0" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M50 66 l-4 4 M50 66 l4 4" stroke="#FF8FB1" strokeWidth="2" strokeLinecap="round" />
    </g>
  ),

  /* 浣熊 */
  raccoon: (
    <g>
      <path
        d="M78 74 C100 72 100 40 80 36 C88 50 84 62 68 64 Z"
        fill="#9AA0AE"
        stroke={INK}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M80 70 l6 -8 M84 58 l6 -8 M84 46 l6 -6" stroke="#4A3B63" strokeWidth="4" strokeLinecap="round" />
      <path d="M30 44 l0 -18 l16 12 Z" fill="#9AA0AE" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M70 44 l2 -18 l-16 10 Z" fill="#9AA0AE" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      <ellipse cx="50" cy="62" rx="28" ry="25" fill="#B9BEC9" stroke={INK} strokeWidth="2.6" />
      {/* 标志性的眼罩 */}
      <path d="M28 56 q10 -8 22 0 q-11 10 -22 0 Z" fill="#4A3B63" opacity=".8" />
      <path d="M72 56 q-10 -8 -22 0 q11 10 22 0 Z" fill="#4A3B63" opacity=".8" />
      <ellipse cx="50" cy="74" rx="14" ry="10" fill="#F0F2F5" />
      {eye(39, 56, 3.2)}
      {eye(61, 56, 3.2)}
      <circle cx="50" cy="70" r="4" fill={INK} />
    </g>
  ),

  /* 狐狸 */
  fox: (
    <g>
      <path
        d="M76 78 C102 74 102 38 80 32 C90 48 86 66 68 68 Z"
        fill="#E8794A"
        stroke={INK}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M84 66 l10 -4" stroke="#FFF3E4" strokeWidth="6" strokeLinecap="round" />
      <path d="M28 48 l-4 -24 l20 12 Z" fill="#E8794A" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M72 48 l4 -24 l-20 12 Z" fill="#E8794A" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M30 44 l-2 -14 l12 8 Z" fill="#FFC2D6" />
      <path d="M70 44 l2 -14 l-12 8 Z" fill="#FFC2D6" />
      <ellipse cx="50" cy="62" rx="27" ry="24" fill="#E8794A" stroke={INK} strokeWidth="2.6" />
      <path d="M50 62 q-14 0 -16 12 q16 8 32 0 q-2 -12 -16 -12 Z" fill="#FFF3E4" />
      {eye(39, 56)}
      {eye(61, 56)}
      <ellipse cx="50" cy="70" rx="4.4" ry="3.4" fill={INK} />
    </g>
  ),

  /* 雪貂 */
  ferret: (
    <g>
      <path
        d="M74 80 C98 78 98 44 78 40 C86 56 82 70 64 72 Z"
        fill="#F2E4D0"
        stroke={INK}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <ellipse cx="48" cy="64" rx="24" ry="22" fill="#FFF6EA" stroke={INK} strokeWidth="2.6" />
      <ellipse cx="66" cy="52" rx="16" ry="14" fill="#FFF6EA" stroke={INK} strokeWidth="2.4" />
      <path d="M56 40 l-4 -12 l10 6 Z" fill="#EBD9C4" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M74 42 l2 -12 l8 8 Z" fill="#EBD9C4" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      {eye(62, 50, 3.2)}
      {eye(74, 52, 3.2)}
      <ellipse cx="80" cy="58" rx="3.4" ry="2.6" fill="#FF8FB1" />
      <circle cx="40" cy="60" r="5" fill="#FFC2D6" opacity=".5" />
    </g>
  ),

  /* 青蛙 */
  frog: (
    <g>
      <ellipse cx="50" cy="64" rx="30" ry="24" fill="#7ECB6F" stroke={INK} strokeWidth="2.6" />
      <ellipse cx="50" cy="76" rx="18" ry="11" fill="#C7EEB8" opacity=".85" />
      {/* 眼睛长在头顶是青蛙的灵魂 */}
      <circle cx="34" cy="40" r="13" fill="#7ECB6F" stroke={INK} strokeWidth="2.6" />
      <circle cx="66" cy="40" r="13" fill="#7ECB6F" stroke={INK} strokeWidth="2.6" />
      <circle cx="34" cy="40" r="7" fill="#FFF3E4" />
      <circle cx="66" cy="40" r="7" fill="#FFF3E4" />
      <circle cx="35" cy="41" r="3.6" fill={INK} />
      <circle cx="67" cy="41" r="3.6" fill={INK} />
      <path d="M36 72 q14 10 28 0" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </g>
  ),

  /* 刺猬 */
  hedgehog: (
    <g>
      {/* 背刺：一圈三角 */}
      {[-50, -25, 0, 25, 50].map((deg) => {
        const rad = ((deg - 90) * Math.PI) / 180;
        const bx = 50 + Math.cos(rad) * 28;
        const by = 62 + Math.sin(rad) * 26;
        const tx = 50 + Math.cos(rad) * 44;
        const ty = 62 + Math.sin(rad) * 42;
        return (
          <path
            key={deg}
            d={`M${bx - 9} ${by + 6} L${tx} ${ty} L${bx + 9} ${by + 6} Z`}
            fill="#8C6A4F"
            stroke={INK}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        );
      })}
      <ellipse cx="50" cy="68" rx="26" ry="20" fill="#D9B98C" stroke={INK} strokeWidth="2.6" />
      <ellipse cx="50" cy="74" rx="15" ry="10" fill="#F5E6D3" />
      {eye(41, 66, 3.2)}
      {eye(59, 66, 3.2)}
      <circle cx="50" cy="72" r="3.6" fill={INK} />
    </g>
  ),

  /* 瓢虫 */
  ladybug: (
    <g>
      <ellipse cx="50" cy="72" rx="26" ry="16" fill="#4A3B63" opacity=".16" />
      <circle cx="50" cy="56" r="28" fill="#E4572E" stroke={INK} strokeWidth="2.6" />
      <path d="M50 28 L50 84" stroke={INK} strokeWidth="3" />
      <path d="M24 52 C32 34 68 34 76 52 Z" fill="#4A3B63" />
      <circle cx="36" cy="64" r="5" fill="#4A3B63" />
      <circle cx="64" cy="64" r="5" fill="#4A3B63" />
      <circle cx="42" cy="76" r="4" fill="#4A3B63" />
      <circle cx="58" cy="76" r="4" fill="#4A3B63" />
      {eye(43, 44, 3)}
      {eye(57, 44, 3)}
      <path d="M44 32 q-8 -10 -14 -8 M56 32 q8 -10 14 -8" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </g>
  ),

  /* 兔子 */
  rabbit: (
    <g>
      <circle cx="80" cy="72" r="10" fill="#FFF6EA" stroke={INK} strokeWidth="2.4" />
      <path
        d="M32 44 C24 18 34 8 42 12 C50 16 48 36 44 46 Z"
        fill="#FFF6EA"
        stroke={INK}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M64 46 C60 36 60 16 68 12 C76 8 86 18 78 44 Z"
        fill="#FFF6EA"
        stroke={INK}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M35 42 C30 24 36 18 41 20 C45 23 44 36 42 44 Z" fill="#FFC2D6" />
      <path d="M67 44 C64 36 65 22 69 20 C74 18 79 24 75 42 Z" fill="#FFC2D6" />
      <ellipse cx="52" cy="66" rx="27" ry="24" fill="#FFF6EA" stroke={INK} strokeWidth="2.6" />
      {eye(42, 60)}
      {eye(62, 60)}
      <ellipse cx="52" cy="72" rx="4" ry="3.2" fill="#FF8FB1" />
      <path d="M46 78 q6 4 12 0" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  ),
};
