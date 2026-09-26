/**
 * 站点全局配置 —— 想改名字、简介、导航、社交链接，只改这一个文件。
 */
export const SITE = {
  /** 浏览器标签页和首页大标题显示的名字 */
  title: '21nc',
  /** 一句话简介，显示在首页大标题下面 */
  tagline: 'UESTC student',
  /** 用于 SEO 描述和 RSS */
  description: '个人博客：技术笔记、和一些随想。',
  /** 文章列表里作者署名 */
  author: '21nc&dw0x',
  /** 页脚版权署名 */
  copyrightName: '21nc&dw0x',
  /** 语言标签 */
  lang: 'zh-CN',

  /** 顶部导航 */
  nav: [
    { label: '首页', href: '/' },
    { label: '文章', href: '/blog/' },
    { label: '关于', href: '/about/' },
  ],

  /** 社交链接，不需要的删掉即可 */
  social: [
    { label: 'GitHub', href: 'https://github.com/ZinChl' },
    { label: 'Email', href: 'mailto:261164313@qq.com' },
  ],

  /** 首页「最近文章」显示几篇 */
  homePostCount: 5,
} as const;
