import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * 编辑器（Sveltia CMS）留空的日期字段会写成空字符串或 null。
 * 直接交给 z.coerce.date() 会得到 1970-01-01 这种假日期，所以先归一成 undefined。
 */
const optionalDate = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.date().optional()
);

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: optionalDate,
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    // 编辑器用它来决定文件名；站点按文件名生成 URL，所以这里只是占位
    slug: z.string().optional(),
  }),
});

export const collections = { blog };
