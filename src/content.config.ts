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
    // 编辑器（Sveltia CMS）用它决定文章网址。Astro 会用这个字段覆盖由文件名推导出的 slug，
    // 所以改了它 URL 就跟着变 —— 留言也是按它分区的，改 slug 相当于换了个留言区。
    slug: z.string().optional(),
  }),
});

export const collections = { blog };
