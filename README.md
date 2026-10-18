# 个人博客

Astro 静态博客，部署在 Azure Static Web Apps 免费层。

- 线上地址：https://wonderful-island-01ed1a600.3.azurestaticapps.net
- 内容编辑器：https://wonderful-island-01ed1a600.3.azurestaticapps.net/admin/

## 在网页上写文章（推荐）

打开 `/admin/`，用 GitHub 令牌登录，就能直接写、直接发，不用碰命令行。

**第一次登录：**

1. 点「使用访问令牌登录」
2. 点弹窗里的 GitHub 链接（权限已经预选好了），生成一个 **fine-grained token**：
   - Repository access → Only select repositories → `ZinChl/blog`
   - Permissions → Repository permissions → **Contents: Read and write**
3. 把令牌粘回弹窗，点「登录」

令牌只存在**这台电脑的这个浏览器**里（localStorage），不会写进仓库。

**关于安全**：`/admin/` 这个页面本身是公开的，但没有任何令牌就什么也做不了 ——
真正的门锁是 GitHub 令牌。所以：

- 别在共用电脑上登录
- 令牌随时可以在 [GitHub 设置](https://github.com/settings/tokens) 里吊销
- 想换机器，重新生成一个令牌就行

**用完的效果**：编辑器保存 = 向 `main` 分支提交一个 commit = Azure 自动重新构建发布，约 1 分钟。

## 留言（匿名，不需要登录）

每篇文章底部都有留言区，任何人不用注册就能留言。

- 留言存在 Azure 表存储的 `comments` 表，`PartitionKey` 就是文章的 slug
- 防垃圾：隐藏蜜罐字段、最短填写时间、同一 IP 同一篇文章每小时最多 5 条、长度上限
- 只存 IP 的**哈希**，不存原始 IP
- 留言内容在渲染时一律走 `textContent`，杜绝 XSS

**删除留言**：在留言区右下角点「管理」，粘贴管理令牌，删除按钮就会出现。
令牌位置：Azure 门户 → `zinchl-blog` → 配置 → `COMMENTS_ADMIN_TOKEN`。
粘贴一次后会记在这台浏览器里，再点「管理」可退出管理模式。

**注意**：留言按文章的 `slug` 分区，**改 slug 等于换了一个留言区** —— 旧留言不会跟着过去。

**后端**：`api/comments/`，是 Azure Static Web Apps 的托管函数。
必须用 Azure Functions 的 **Node v3 编程模型**（`module.exports` + `function.json`）；
SWA 不支持 v4 的 `app.http()` 写法，用了会**静默 404 且不报任何错**。
参见 [Azure/static-web-apps#1139](https://github.com/Azure/static-web-apps/issues/1139)。

## 或者：本地写 Markdown

在 `src/content/blog/` 下新建 `.md` 文件，URL 默认由文件名决定（`hello-world.md` → `/blog/hello-world/`）：

```markdown
---
title: 文章标题
description: 一句话摘要，显示在列表页和搜索引擎结果里
pubDate: 2026-09-26
tags: ['标签']
---

正文。
```

可选字段：

| 字段 | 说明 |
| --- | --- |
| `updatedDate` | 有更新时显示「更新于 …」 |
| `draft` | 设为 `true` 则完全不发布，也不会生成页面 |
| `slug` | 覆盖由文件名推导的网址。改了它文章 URL 就变，留言区也跟着换 |

写完 `git push`，同样会自动上线。

## 本地开发

```bash
npm install       # 首次
npm run dev       # 打开 http://localhost:4321，编辑器在 /admin/
npm run build     # 生成静态文件到 dist/
npm run preview   # 预览构建结果
```

`npm run dev` 和 `npm run build` 都会先跑 `scripts/copy-cms.mjs`，
把 Sveltia CMS 的浏览器包从 `node_modules` 复制到 `public/admin/`（这些产物已在 `.gitignore` 里忽略）。

## 改站点信息

`src/site.config.ts` 一个文件管所有：站点名、简介、导航菜单、社交链接、首页显示几篇文章。

改文章字段（例如加封面图）要动两个地方：`src/content.config.ts` 定义校验规则，
`public/admin/config.yml` 决定编辑器里显示什么控件。

## 前端设计（2026.10 重做）

整站视觉重做为「**21nc · 星海档案 / THE ASTRAL ARCHIVE**」：深空墨蓝 + 暖金 + 鸢尾紫，
衬线大标题 + 等宽小标签 + 星盘线稿 + 细颗粒质感；深色为默认，右上角可切到羊皮纸浅色主题。

- **设计令牌**：`src/styles/tokens.css`（颜色、字体、间距、缓动都在这里；改主题只动这一个文件）
- **样式分层**：`site.css`（页头页脚/跑马灯/转场）、`hero.css`（首屏与星盘）、
  `home.css`（首页卡片/自述）、`pages.css`（列表页/文章页/关于/404/留言）；入口是 `global.css`
- **字体**：西文自托管 Cormorant Garamond（标题）与 JetBrains Mono（元信息），
  文件在 `public/fonts/`；中文使用系统衬线/无衬线回退，不额外下载中文字体
- **动效**：`src/scripts/motion.ts`（滚动显现、Lenis 平滑滚动、实时时钟、磁吸按钮、滚动进度），
  `components/Starfield.astro`（手写 WebGL 星场，`prefers-reduced-motion` / 低性能自动降级）、
  `components/Cursor.astro`（桌面端自定义光标）
- **装饰图形**：`components/Astrolabe.astro`（星盘）、`components/StarChart.astro`
  （按文章标题生成的确定性星图），全部为 SVG / CSS，无位图依赖
- **首屏底图**：Hubble Ultra Deep Field，NASA / STScI（公有领域，页脚已标注）
- **主题预览**：任意页面加 `?theme=light` 或 `?theme=dark`，方便分享某一种配色
- **可访问性**：键盘焦点可见、`prefers-reduced-motion` 全量降级、无 JS 时内容完整可见；
  首页 Lighthouse：Accessibility / Best Practices / SEO = 100

> 新增文章不需要改任何样式：列表页、文章页会自动套用新的排版。
> 想换配色/字体，从 `tokens.css` 改起。

## 目录结构

```
├── astro.config.mjs            # Astro 配置（含站点域名）
├── scripts/copy-cms.mjs        # 构建时准备编辑器资源
├── api/                        # ★ 留言后端（SWA 托管函数）
│   ├── comments/               #   GET 列表 / POST 发表 / DELETE 删除
│   ├── host.json
│   └── package.json
├── public/
│   ├── fonts/                  # 自托管西文字体（Cormorant / JetBrains Mono）
│   ├── images/                 # 文章配图 + hero 星云底图
│   ├── favicon.svg             # 金色星盘图标
│   ├── og.jpg                  # 社交分享卡片（1200×630）
│   ├── robots.txt              # 不收录 /admin/
│   ├── staticwebapp.config.json # 指定 node:20 运行时
│   └── admin/
│       ├── index.html          # 编辑器入口
│       └── config.yml          # ★ 编辑器能改哪些字段
└── src/
    ├── site.config.ts          # ★ 站点信息都在这（名字/简介/导航/社交）
    ├── content.config.ts       # ★ 文章字段校验
    ├── content/blog/           # ★ 文章放这
    ├── styles/
    │   ├── global.css          # 样式入口（按顺序 import 下面几层）
    │   ├── tokens.css          # 设计令牌 + 字体 + 基础排版
    │   ├── site.css            # 页头 / 页脚 / 跑马灯 / 页面转场
    │   ├── hero.css            # 首屏 / 星盘 / 星野
    │   ├── home.css            # 首页卡片 / 自述 / 数据统计
    │   └── pages.css           # 列表页 / 文章页 / 关于 / 404 / 留言
    ├── scripts/motion.ts       # 动效系统（滚动显现 / Lenis / 时钟 / 磁吸）
    ├── components/
    │   ├── Hero.astro          # 首屏
    │   ├── Astrolabe.astro     # 星盘插图
    │   ├── Starfield.astro     # WebGL 星场
    │   ├── StarChart.astro     # 文章星图缩略
    │   ├── Cursor.astro        # 自定义光标
    │   ├── Icon.astro          # 图标
    │   ├── PostCard.astro      # 首页文章卡
    │   ├── Toc.astro           # 文章目录
    │   └── Comments.astro      # ★ 留言区
    ├── layouts/BaseLayout.astro
    ├── utils.ts                # 日期 / 阅读时长
    └── pages/
        ├── index.astro         # 首页
        ├── about.astro         # 关于
        ├── 404.astro
        ├── rss.xml.js          # RSS 订阅
        └── blog/
            ├── index.astro     # 文章列表（含 tag 筛选、按年分组）
            └── [...slug].astro # 文章详情（目录 / 阅读进度 / 代码复制）
```

## 部署

推送到 `main` 分支即自动部署，工作流文件由 Azure 生成在 `.github/workflows/`。

换自定义域名时，记得同步改 `astro.config.mjs` 里的 `SITE_URL`，
否则 sitemap、canonical 链接和 RSS 里的地址会不对。
