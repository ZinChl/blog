/**
 * 站点全局配置 —— 想改名字、简介、导航、社交链接，只改这一个文件。
 */
export const SITE = {
  /** 浏览器标签页和品牌处显示的名字 */
  title: '21nc',
  /** 英文副标题 / 站点概念名 */
  titleEn: 'HIDDEN DIMENSION',
  /** 中文站名 */
  nameCn: '星海档案',
  /** 一句话简介 */
  tagline: 'UESTC student · 写代码，看星星，记点东西',
  /** 用于 SEO 描述和 RSS */
  description: '个人博客：技术笔记和一些随想。',
  /** 文章列表里作者署名 */
  author: '21nc&dw0x',
  /** 页脚版权署名 */
  copyrightName: '21nc&dw0x',
  /** 语言标签 */
  lang: 'zh-CN',
  /** 建站年份 */
  since: 2026,
  /** 所在地 & 坐标（首页信息轨 / 页脚） */
  location: 'UESTC',
  /** 城市（正文/署名等短场景用） */
  city: '成都',
  /** 英文/等宽场景用的短地名 */
  locationEn: 'UESTC · CHENGDU',
  coords: '30.75°N / 103.94°E',
  /** 页脚时钟时区（成都，UTC+8） */
  timeZone: 'Asia/Shanghai',
  /** 时钟旁的小标签 */
  clockLabel: 'CST',

  /** 首页 hero 文案 */
  hero: {
    eyebrow: 'HIDDEN DIMENSION',
    year: 'EST. 2026',
    subtitleEn: 'Hidden Dimension',
    description:
      '收集一些想法、笔记，以及偶尔冒出来的微光。这里没有宏大的叙事，只有一个人认真生活过的痕迹。',
    primaryCta: '翻开最近的文章',
  },

  /** 页脚的一句话 */
  footerLine: '一本写给群星与未知的私人札记，也是通往更远处的一张星图。',
  footerLatin: 'A quiet archive beyond the gate of stars.',

  /** 顶部导航 */
  nav: [
    { label: '首页', href: '/' },
    { label: '文章', href: '/blog/' },
    { label: '关于', href: '/about/' },
  ],

  /** 社交链接，不需要的删掉即可。icon 可设为 github / email / rss / link */
  social: [
    { label: 'GitHub', href: 'https://github.com/ZinChl', icon: 'github' },
    { label: 'Email', href: 'mailto:261164313@qq.com', icon: 'email' },
  ],

  /** 首页「最近文章」显示几篇（含 1 篇头条） */
  homePostCount: 5,
} as const;
