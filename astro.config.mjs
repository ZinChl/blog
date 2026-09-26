// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// ⚠️ 部署到 Azure Static Web Apps 后，把下面这行换成你的真实域名。
// 首次部署时 Azure 会给你一个形如 https://<随机名>.azurestaticapps.net 的地址。
export const SITE_URL = 'https://example.azurestaticapps.net';

export default defineConfig({
  site: SITE_URL,
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
});
