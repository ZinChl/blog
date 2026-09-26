// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Azure Static Web Apps 分配的域名。绑定自定义域名后改成新域名即可。
export const SITE_URL = 'https://wonderful-island-01ed1a600.3.azurestaticapps.net';

export default defineConfig({
  site: SITE_URL,
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
});
