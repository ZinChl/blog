---
slug: the-start
title: 开始写博客了
description: 为什么要写，写些什么，以及这个站是怎么搭起来的。
pubDate: 2026-09-26
updatedDate: ''
tags:
  - 随笔
draft: false
---

一些随机的想法和碎碎念。有时候文章被撰写，有时候文章被发布。

## 打算写什么

- **技术笔记** —— 踩过的坑、调通的东西、读源码的收获
- **课程相关** —— 有值得记下来的推导或实现就写
- **乱七八糟的想法** —— 不限于技术

不追求更新频率。有东西想说的时候写，没话说就空着。

## 这个站是怎么搭的

| 部分 | 用了什么 |
| --- | --- |
| 站点生成 | [Astro](https://astro.build)（静态输出） |
| 内容 | Markdown 文件 |
| 托管 | Azure Static Web Apps 免费层 |
| 部署 | GitHub Actions 自动构建 |

整个流程是：本地写一个 `.md` 文件，`git push`，剩下的 Azure 自己会做 —— 重新构建、推到全球 CDN、刷新 HTTPS 证书。不用管服务器，也不会产生费用。

## 加一篇新文章有多简单

在 `src/content/blog/` 下面建一个 Markdown 文件就行：

```markdown
---
title: 文章标题
description: 一句话摘要，会显示在列表页和搜索结果里
pubDate: 2026-09-26
tags: ['标签']
---

正文从这里开始。
```

嗯。那么，我们开始吧？
