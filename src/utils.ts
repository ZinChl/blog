/** 把日期格式化成 2026-09-26 这种稳定形式 */
export function formatDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 机器可读时间 */
export function isoDate(date: Date): string {
  return date.toISOString();
}
