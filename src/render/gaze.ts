/* ============================================================
   视线计算
   单独成文件而不是塞在 PetSvg.tsx 里：组件文件只导出组件，
   否则 Vite 的 Fast Refresh 会退化成整页刷新，改样式时体验很差。
   ============================================================ */

/** 视线方向，值域 [-1, 1] */
export interface Gaze {
  x: number;
  y: number;
}

export const STILL_GAZE: Gaze = { x: 0, y: 0 };

/**
 * 把屏幕坐标换算成宠物能理解的视线方向。
 * 眼睛位置比几何中心略低，所以纵向基准取 55% 高度而不是 50%。
 */
export function gazeFromPoint(clientX: number, clientY: number, rect: DOMRect): Gaze {
  if (rect.width === 0 || rect.height === 0) return STILL_GAZE;

  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height * 0.55;

  // 除以半个宽度并夹紧，越靠边越是「用力看」
  const x = Math.max(-1, Math.min(1, (clientX - cx) / (rect.width * 0.5)));
  const y = Math.max(-1, Math.min(1, (clientY - cy) / (rect.height * 0.5)));

  return { x, y };
}
