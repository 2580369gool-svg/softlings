/** 把毫秒时长格式化成「1 小时 20 分钟」这样的人话 */
export function humanizeDuration(
  ms: number,
  units: { day: string; hour: string; minute: string; second: string },
): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSec / 86_400);
  const hours = Math.floor((totalSec % 86_400) / 3_600);
  const minutes = Math.floor((totalSec % 3_600) / 60);
  const seconds = totalSec % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${units.day}`);
  if (hours > 0) parts.push(`${hours} ${units.hour}`);
  // 只有分钟级别才显示秒，避免「3 天 4 小时 12 分 7 秒」这种啰嗦表达
  if (hours === 0 && days === 0) {
    if (minutes > 0) parts.push(`${minutes} ${units.minute}`);
    if (minutes < 10) parts.push(`${seconds} ${units.second}`);
  } else if (minutes > 0 && days === 0) {
    parts.push(`${minutes} ${units.minute}`);
  }

  return parts.slice(0, 2).join(" ") || `0 ${units.second}`;
}
