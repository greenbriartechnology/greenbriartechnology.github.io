// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Canonical site URL. Used for sitemap, canonical tags, and absolute links.
  site: 'https://www.greenbriartechnology.com',
  // Served from the domain root on GitHub Pages (custom domain), so no base path.
  base: '/',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
});
