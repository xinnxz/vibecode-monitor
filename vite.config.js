import { defineConfig } from 'vite';

/**
 * Vite Configuration untuk GitHub Pages.
 * 
 * `base`: path prefix saat di-deploy.
 * Di GitHub Pages, URL-nya jadi: https://xinnx.github.io/antigravity-hack/
 * Jadi base harus '/antigravity-hack/' (nama repo).
 * 
 * Tanpa ini, semua asset (CSS, JS, fonts) akan 404 di GitHub Pages
 * karena mereka akan cari di root '/' padahal seharusnya '/antigravity-hack/'.
 */
export default defineConfig({
  base: '/antigravity-hack/',
});
