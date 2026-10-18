/**
 * motion.ts —「星海档案」全站动效系统
 * ---------------------------------------------------------------------------
 * 由 BaseLayout 引入一次（`<script>import '../scripts/motion';</script>`），
 * 负责以下互相独立的模块，全部幂等、可随页面切换安全重建：
 *
 *  1. [data-reveal]    滚动显现：IntersectionObserver + .is-revealed
 *                      · data-reveal-delay="0.12"（秒，单元素延迟）
 *                      · data-reveal-stagger（父元素，子项按顺序递增延迟）
 *     —— 只有 JS 生效时才给 <html> 加 .js-motion，无 JS / 减少动态时内容始终可见；
 *        另外带 2.6s 兜底，避免 IO 异常导致首屏内容永远隐藏。
 *  2. Lenis 平滑滚动；prefers-reduced-motion 下自动关闭；
 *     拦截页内锚点 a[href^="#"]，预留 -90px 的页头高度。
 *  3. 页头状态：滚动超过 24px 给 header.site-header 加 .is-scrolled；
 *     同步所有 [data-scroll-progress] 的 scaleX(进度)。
 *  4. 实时时钟：[data-clock]，可选 data-tz="Asia/Shanghai"（默认 Asia/Shanghai）。
 *  5. 磁吸按钮：[data-magnetic] 跟随指针最多 ~6px，带回弹缓动；触屏/减少动态关闭。
 *
 * 依赖：仅 lenis（package.json 已安装）。样式部分（[data-reveal] 的初始隐藏与
 * 过渡、.scroll-progress、.btn 等）在 src/styles/tokens.css / site.css 中，
 * 本文件只负责加类、写延迟变量与驱动状态。
 */

import Lenis from 'lenis';

/* ========================================================================== */
/* 常量与小工具                                                                */
/* ========================================================================== */

/** 页头高度（锚点跳转的预留偏移） */
const SCROLL_OFFSET = -90;
/** 页头进入“已滚动”状态的阈值 */
const HEADER_SCROLL_THRESHOLD = 24;
/** 兜底：IO 失效时，首屏元素最迟多久必须可见（毫秒） */
const REVEAL_FALLBACK_MS = 2600;

const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointerQuery = window.matchMedia('(pointer: fine)');

const prefersReducedMotion = (): boolean => reduceQuery.matches;

/* ========================================================================== */
/* 模块级状态（每次 boot 重建，teardown 全部释放）                             */
/* ========================================================================== */

let ac: AbortController | null = null;
let lenis: Lenis | null = null;
let revealObserver: IntersectionObserver | null = null;
let clockTimer: number | null = null;
let headerRaf = 0;
let magneticRaf = 0;
let revealFallbackTimer: number | null = null;
let bootKey: string | null = null;

/** 给 window/document 绑事件时统一挂 AbortSignal，teardown 一次全解绑 */
function listen<K extends keyof WindowEventMap>(
  target: Window,
  type: K,
  handler: (event: WindowEventMap[K]) => void,
  options: AddEventListenerOptions = {}
): void {
  if (!ac) return;
  target.addEventListener(type, handler, { ...options, signal: ac.signal });
}

function listenDoc<K extends keyof DocumentEventMap>(
  target: Document,
  type: K,
  handler: (event: DocumentEventMap[K]) => void,
  options: AddEventListenerOptions = {}
): void {
  if (!ac) return;
  target.addEventListener(type, handler, { ...options, signal: ac.signal });
}

/* ========================================================================== */
/* 1. 滚动显现                                                                */
/* ========================================================================== */

function setupReveal(): void {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
  if (!els.length) return;

  // data-reveal-stagger：父元素声明步长（秒），其内部 [data-reveal] 依次递增
  document.querySelectorAll<HTMLElement>('[data-reveal-stagger]').forEach((parent) => {
    const rawStep = Number.parseFloat(parent.dataset.revealStagger || '');
    const step = Number.isFinite(rawStep) && rawStep >= 0 ? rawStep : 0.09;
    const children = Array.from(parent.querySelectorAll<HTMLElement>('[data-reveal]'));
    children.forEach((el, index) => {
      const rawBase = Number.parseFloat(el.dataset.revealDelay || '');
      const base = Number.isFinite(rawBase) ? rawBase : 0;
      // 子项自身若显式写了 data-reveal-delay，则作为起点叠加
      el.style.setProperty('--reveal-delay', `${(base + index * step).toFixed(3)}s`);
    });
  });

  // 不在 stagger 父元素里的元素，直接使用 data-reveal-delay
  els.forEach((el) => {
    if (el.style.getPropertyValue('--reveal-delay')) return;
    const raw = Number.parseFloat(el.dataset.revealDelay || '');
    if (Number.isFinite(raw) && raw > 0) {
      el.style.setProperty('--reveal-delay', `${raw.toFixed(3)}s`);
    }
  });

  // 浏览器不支持 IO：直接全部显示，宁可没有动画也不能少内容
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  try {
    revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-revealed');
          revealObserver?.unobserve(entry.target);
        }
      },
      // 元素露出约 12% 时触发；底部留出一点余量，避免“刚碰到就动”
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );
    els.forEach((el) => revealObserver?.observe(el));
  } catch (error) {
    console.warn('[motion] IntersectionObserver 初始化失败，已直接显示内容', error);
    revealObserver?.disconnect();
    revealObserver = null;
    els.forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  // 兜底：万一 IO 没有回调（浏览器 bug / iframe / 异常），首屏元素 2.6s 后强制出现
  revealFallbackTimer = window.setTimeout(() => {
    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    els.forEach((el) => {
      if (el.classList.contains('is-revealed')) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < viewportH * 1.1 && rect.bottom > -100) {
        el.classList.add('is-revealed');
      }
    });
  }, REVEAL_FALLBACK_MS);
}

/* ========================================================================== */
/* 2. 平滑滚动（Lenis）                                                        */
/* ========================================================================== */

function setupSmoothScroll(): void {
  if (prefersReducedMotion()) return;

  try {
    lenis = new Lenis({
      // lerp 越小越“顺滑”，0.09 左右接近 Linear / Vercel 手感的阻尼
      lerp: 0.09,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
      autoRaf: true,
    });
  } catch (error) {
    console.warn('[motion] Lenis 初始化失败，回退到原生滚动', error);
    lenis = null;
  }

  // 供其它脚本（如 BaseLayout 的「回到顶部」）复用同一个 Lenis 实例
  (window as Window & { lenis?: Lenis | null }).lenis = lenis;

  // 页内锚点：交给 Lenis 平滑滚动，并把页头高度算进偏移
  listenDoc(document, 'click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest<HTMLAnchorElement>('a[href^="#"]');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href || href === '#') return;

    let destination: HTMLElement | null = null;
    try {
      destination = document.querySelector<HTMLElement>(decodeURIComponent(href));
    } catch {
      destination = null;
    }
    if (!destination) return;

    event.preventDefault();
    if (lenis) {
      lenis.scrollTo(destination, { offset: SCROLL_OFFSET, duration: 1.35 });
    } else {
      const top = destination.getBoundingClientRect().top + window.scrollY + SCROLL_OFFSET;
      window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
    // 更新 URL 但不触发原生跳转
    if (history.pushState) history.pushState(null, '', href);
    destination.setAttribute('tabindex', '-1');
    destination.focus({ preventScroll: true });
  });
}

/* ========================================================================== */
/* 3. 页头状态 + 阅读进度                                                     */
/* ========================================================================== */

function setupScrollState(): void {
  const header = document.querySelector<HTMLElement>('header.site-header');
  const progressEls = Array.from(document.querySelectorAll<HTMLElement>('[data-scroll-progress]'));
  if (!header && !progressEls.length) return;

  const update = (): void => {
    headerRaf = 0;
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    if (header) header.classList.toggle('is-scrolled', y > HEADER_SCROLL_THRESHOLD);

    if (!progressEls.length) return;
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    for (const el of progressEls) {
      el.style.transform = `scaleX(${progress.toFixed(4)})`;
    }
  };

  const schedule = (): void => {
    if (headerRaf) return;
    headerRaf = requestAnimationFrame(update);
  };

  listen(window, 'scroll', schedule, { passive: true });
  listen(window, 'resize', schedule, { passive: true });
  // Lenis 接管后 window scroll 仍会派发，但再挂一次它的回调可保证虚拟滚动同步
  lenis?.on('scroll', schedule);
  update();
}

/* ========================================================================== */
/* 4. 实时时钟                                                                */
/* ========================================================================== */

function setupClocks(): void {
  const clocks = Array.from(document.querySelectorAll<HTMLElement>('[data-clock]'));
  if (!clocks.length) return;

  const formatters = new Map<string, Intl.DateTimeFormat>();
  const formatterFor = (timeZone: string): Intl.DateTimeFormat => {
    const cached = formatters.get(timeZone);
    if (cached) return cached;
    let formatter: Intl.DateTimeFormat;
    try {
      formatter = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        hourCycle: 'h23',
        timeZone,
      });
    } catch {
      // 时区非法时退回默认时区
      formatter = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        hourCycle: 'h23',
        timeZone: 'Asia/Shanghai',
      });
    }
    formatters.set(timeZone, formatter);
    return formatter;
  };

  const tick = (): void => {
    const now = new Date();
    for (const el of clocks) {
      const tz = el.dataset.tz || 'Asia/Shanghai';
      el.textContent = formatterFor(tz).format(now);
    }
  };

  tick();
  clockTimer = window.setInterval(tick, 1000);
}

/* ========================================================================== */
/* 5. 磁吸按钮                                                                */
/* ========================================================================== */

function setupMagnetics(): void {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-magnetic]'));
  if (!els.length) return;
  if (prefersReducedMotion() || !finePointerQuery.matches) return;

  interface MagneticState {
    x: number;
    y: number;
    tx: number;
    ty: number;
    active: boolean;
  }

  const states = new Map<HTMLElement, MagneticState>();
  // 最大位移（px）与跟随强度
  const LIMIT = 6;
  const FOLLOW = 0.22;

  const ensureLoop = (): void => {
    if (magneticRaf) return;
    const step = (): void => {
      magneticRaf = 0;
      let moving = false;
      states.forEach((state, el) => {
        state.x += (state.tx - state.x) * FOLLOW;
        state.y += (state.ty - state.y) * FOLLOW;
        if (Math.abs(state.tx - state.x) < 0.05 && Math.abs(state.ty - state.y) < 0.05) {
          state.x = state.tx;
          state.y = state.ty;
        }
        if (state.x !== 0 || state.y !== 0 || state.active) {
          el.style.translate = `${state.x.toFixed(2)}px ${state.y.toFixed(2)}px`;
        } else {
          el.style.removeProperty('translate');
        }
        if (state.active || state.x !== state.tx || state.y !== state.ty) moving = true;
      });
      if (moving) magneticRaf = requestAnimationFrame(step);
    };
    magneticRaf = requestAnimationFrame(step);
  };

  els.forEach((el) => {
    const state: MagneticState = { x: 0, y: 0, tx: 0, ty: 0, active: false };
    states.set(el, state);

    const onMove = (event: PointerEvent): void => {
      if (event.pointerType !== 'mouse') return;
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      // 离中心越远吸力越大，但不超过 LIMIT
      const dx = Math.max(-LIMIT, Math.min(LIMIT, (event.clientX - centerX) * 0.35));
      const dy = Math.max(-LIMIT, Math.min(LIMIT, (event.clientY - centerY) * 0.35));
      state.tx = dx;
      state.ty = dy;
      state.active = true;
      ensureLoop();
    };

    const onLeave = (): void => {
      state.tx = 0;
      state.ty = 0;
      state.active = false;
      ensureLoop();
    };

    el.addEventListener('pointermove', onMove, { passive: true, signal: ac?.signal });
    el.addEventListener('pointerleave', onLeave, { signal: ac?.signal });
    el.addEventListener('blur', onLeave, { signal: ac?.signal });
  });
}

/* ========================================================================== */
/* 生命周期                                                                   */
/* ========================================================================== */

function teardown(): void {
  ac?.abort();
  ac = null;

  revealObserver?.disconnect();
  revealObserver = null;

  if (clockTimer !== null) {
    window.clearInterval(clockTimer);
    clockTimer = null;
  }
  if (revealFallbackTimer !== null) {
    window.clearTimeout(revealFallbackTimer);
    revealFallbackTimer = null;
  }
  if (headerRaf) cancelAnimationFrame(headerRaf);
  headerRaf = 0;
  if (magneticRaf) cancelAnimationFrame(magneticRaf);
  magneticRaf = 0;

  // 磁吸按钮恢复原状
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    el.style.removeProperty('translate');
  });

  if (lenis) {
    lenis.destroy();
    lenis = null;
  }
  (window as Window & { lenis?: Lenis | null }).lenis = null;

  document.documentElement.classList.remove('lenis', 'lenis-smooth', 'lenis-stopped');
}

function boot(): void {
  teardown();
  ac = new AbortController();

  // 只有 JS 生效后才允许 CSS 隐藏 [data-reveal]，无 JS 用户直接看到内容
  document.documentElement.classList.add('js-motion');

  try {
    setupReveal();
    setupSmoothScroll();
    setupScrollState();
    setupClocks();
    setupMagnetics();
  } catch (error) {
    // 任一模块异常都不能把内容藏死
    console.warn('[motion] 动效初始化异常', error);
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => el.classList.add('is-revealed'));
  }

  bootKey = location.href;
}

document.addEventListener('astro:before-swap', () => {
  teardown();
  bootKey = null;
});

document.addEventListener('astro:page-load', () => {
  // 初次加载也会派发 page-load，用 href 去重，避免重复 boot
  if (bootKey !== location.href) boot();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
