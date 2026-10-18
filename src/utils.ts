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

/** 中日韩统一表意文字 + 假名（按「字」计数的那一类字符） */
const CJK_CHARS = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff]/g;
const LATIN_WORDS = /[A-Za-z0-9]+(?:['’\-][A-Za-z0-9]+)*/g;

/**
 * 把 Markdown 粗略压成正文纯文本：去掉代码块、行内代码、图片/链接语法、
 * HTML 标签和各种记号，只留下供字数统计使用的文字。
 */
function toPlainText(markdown: string): string {
  if (!markdown) return '';
  return markdown
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '') // frontmatter
    .replace(/```[\s\S]*?```/g, ' ') // 围栏代码块
    .replace(/`[^`\n]*`/g, ' ') // 行内代码
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接只保留文字
    .replace(/<[^>]+>/g, ' ') // HTML
    .replace(/^\s{0,3}(?:#{1,6}|>|[-*+]|\d+[.)])\s+/gm, ' ') // 标题/引用/列表记号
    .replace(/[*_~|]{1,3}/g, ' ') // 强调、表格竖线
    .replace(/\s+/g, ' ')
    .trim();
}

/** 字数：中文按字计，西文按词计 —— 用来给列表页显示「约 N 字」一类的信息 */
export function wordCount(text: string): number {
  const plain = toPlainText(text);
  const cjk = (plain.match(CJK_CHARS) ?? []).length;
  const latin = (plain.replace(CJK_CHARS, ' ').match(LATIN_WORDS) ?? []).length;
  return cjk + latin;
}

/**
 * 估算阅读时长：中文约 350 字/分钟，西文约 220 词/分钟，最少 1 分钟。
 * 返回结构化结果，方便页面分别取分钟数和字数。
 */
export function readingTime(text: string): { minutes: number; words: number } {
  const plain = toPlainText(text);
  const cjk = (plain.match(CJK_CHARS) ?? []).length;
  const latin = (plain.replace(CJK_CHARS, ' ').match(LATIN_WORDS) ?? []).length;
  const words = cjk + latin;
  const minutes = Math.max(1, Math.ceil(cjk / 350 + latin / 220));
  return { minutes, words };
}

/** 「约 2 分钟阅读」——文章页 meta 行直接可用 */
export function readingLabel(text: string): string {
  return `约 ${readingTime(text).minutes} 分钟阅读`;
}
