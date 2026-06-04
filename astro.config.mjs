// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Canonical site URL. Used for sitemap, canonical tags, and absolute links.
  site: 'https://www.greenbriartechnology.com',
  // Served from the domain root on GitHub Pages (custom domain), so no base path.
  base: '/',
  // Lenient, matching how GitHub Pages actually serves the site: both /about and
  // /about/ resolve (the former via a 301 to the latter). Our own internal links
  // all use the trailing-slash form to skip that redirect — the links test
  // enforces this — but a stray slash-less URL still works rather than 404ing.
  trailingSlash: 'ignore',
  integrations: [sitemap()],
});
