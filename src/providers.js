/**
 * providers.js — AI Provider Registry
 * 
 * Konfigurasi pusat untuk semua AI provider yang disupport.
 * Setiap provider memiliki:
 * - id:           Key unik (disimpan di database)
 * - name:         Display name
 * - color:        Warna brand untuk badge
 * - svgIcon:      SVG path string (viewBox 0 0 16 16, stroke-only)
 * - defaultHours: Default reset timer saat provider dipilih
 * 
 * Untuk menambah provider baru, cukup tambahkan entry di array PROVIDERS.
 */

export const PROVIDERS = [
  {
    id: 'claude',
    name: 'Claude',
    color: '#D97757',
    defaultHours: 4,
    svgIcon: `<img src="/icons/claude-color.svg" alt="Claude" width="18" height="18" style="object-fit: contain;">`,
  },
  {
    id: 'cursor',
    name: 'Cursor',
    color: '#00B4D8',
    defaultHours: 24,
    svgIcon: `<img src="/icons/icons8-cursor-ai.svg" alt="Cursor" width="18" height="18" style="object-fit: contain;">`,
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    color: '#10A37F',
    defaultHours: 3,
    svgIcon: `<img src="/icons/icons8-chatgpt-96.png" alt="ChatGPT" width="18" height="18" style="object-fit: contain;">`,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    color: '#4285F4',
    defaultHours: 1,
    svgIcon: `<img src="/icons/gemini-color.svg" alt="Gemini" width="18" height="18" style="object-fit: contain;">`,
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    color: '#7C3AED',
    defaultHours: 4,
    svgIcon: `<img src="/icons/icons8-windsurf-editor-96.png" alt="Windsurf" width="18" height="18" style="object-fit: contain;">`,
  },
  {
    id: 'copilot',
    name: 'Copilot',
    color: '#6E40C9',
    defaultHours: 24,
    svgIcon: `<img src="/icons/copilot-color.svg" alt="Copilot" width="18" height="18" style="object-fit: contain;">`,
  },
  {
    id: 'other',
    name: 'Other',
    color: '#64748B',
    defaultHours: 0,
    // Terminal hash — generic
    svgIcon: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
      <line x1="4" y1="3" x2="3" y2="13"/>
      <line x1="9" y1="3" x2="8" y2="13"/>
      <line x1="2" y1="6" x2="11" y2="6"/>
      <line x1="3" y1="10" x2="12" y2="10"/>
    </svg>`,
  },
];

/**
 * Cari provider berdasarkan ID.
 * @param {string} id - Provider ID
 * @returns {Object} Provider config, fallback ke 'other'
 */
export function getProvider(id) {
  return PROVIDERS.find(p => p.id === id) || PROVIDERS.find(p => p.id === 'other');
}
