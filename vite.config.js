import { defineConfig } from 'vite';

/**
 * Vite Configuration untuk GitHub Pages.
 * 
 * `base`: path prefix saat di-deploy.
 * Di GitHub Pages, URL-nya jadi: https://xinnx.github.io/vibecode-monitor/
 * Jadi base harus '/vibecode-monitor/' (nama repo).
 * 
 * Tanpa ini, semua asset (CSS, JS, fonts) akan 404 di GitHub Pages
 * karena mereka akan cari di root '/' padahal seharusnya '/vibecode-monitor/'.
 */
export default defineConfig({
  base: '/vibecode-monitor/',
});
