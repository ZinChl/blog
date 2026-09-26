# 个人博客

Astro 静态博客，部署在 Azure Static Web Apps 免费层。

## 本地开发

```bash
npm install       # 首次
npm run dev       # 打开 http://localhost:4321
npm run build     # 生成静态文件到 dist/
npm run preview   # 预览构建结果
```

## 写一篇新文章

在 `src/content/blog/` 下新建 `.md` 文件，文件名就是 URL（`hello-world.md` → `/blog/hello-world/`）：

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

写完提交推送，Azure 会自动重新构建上线，通常 1–2 分钟。

## 改站点信息

`src/site.config.ts` 一个文件管所有：站点名、简介、导航菜单、社交链接、首页显示几篇文章。

## 目录结构

```
├── astro.config.mjs          # Astro 配置（含站点域名，部署后要改）
├── public/favicon.svg        # 图标
└── src/
    ├── site.config.ts        # ★ 站点信息都在这
    ├── content.config.ts     # 文章字段定义（加字段要改这里）
    ├── content/blog/         # ★ 文章放这
    ├── styles/global.css     # 全部样式（含深浅色主题）
    ├── components/PostCard.astro
    ├── layouts/BaseLayout.astro
    └── pages/
        ├── index.astro       # 首页
        ├── about.astro       # 关于
        ├── 404.astro
        ├── rss.xml.js        # RSS 订阅
        └── blog/
            ├── index.astro   # 文章列表
            └── [...slug].astro  # 文章详情
```

## 部署

推送到 `main` 分支即自动部署（`.github/workflows/azure-static-web-apps.yml`，由 Azure 生成）。

**部署后要做一件事**：把 `astro.config.mjs` 里的 `SITE_URL` 改成 Azure 分配的真实域名，
否则 sitemap、canonical 链接和 RSS 里的地址会是错的。
