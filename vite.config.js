import { defineConfig } from 'vite';

/**
 * Vite Configuration.
 * 
 * `base`: path prefix saat di-deploy.
 * - GitHub Pages: URL = https://xinnxz.github.io/vibecode-monitor/ → base '/vibecode-monitor/'
 * - Vercel/lainnya: URL = https://domain.vercel.app/ → base '/'
 * 
 * Kita deteksi via env var GITHUB_ACTIONS yang otomatis ada di GitHub Actions CI.
 */
const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  base: isGitHubPages ? '/vibecode-monitor/' : '/',
});
