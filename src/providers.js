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
    // Brain/neural icon — circle with inner nodes
    svgIcon: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
      <circle cx="8" cy="8" r="6"/>
      <circle cx="8" cy="6" r="1.2"/>
      <circle cx="5.5" cy="10" r="1"/>
      <circle cx="10.5" cy="10" r="1"/>
      <line x1="8" y1="7.2" x2="6.2" y2="9.2"/>
      <line x1="8" y1="7.2" x2="9.8" y2="9.2"/>
    </svg>`,
  },
  {
    id: 'cursor',
    name: 'Cursor',
    color: '#00B4D8',
    defaultHours: 24,
    // Lightning bolt — instant energy
    svgIcon: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9 2 5 9 8 9 7 14 11 7 8 7 9 2"/>
    </svg>`,
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    color: '#10A37F',
    defaultHours: 3,
    // Chat terminal — bubble with prompt >_
    svgIcon: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 3h12v8H6l-3 2.5V11H2z"/>
      <polyline points="5 6.5 7 8 5 9.5"/>
      <line x1="8" y1="9.5" x2="11" y2="9.5"/>
    </svg>`,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    color: '#4285F4',
    defaultHours: 1,
    // Gem/diamond — dual faceted crystal
    svgIcon: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="8 2 13 6 8 14 3 6"/>
      <line x1="3" y1="6" x2="13" y2="6"/>
      <line x1="8" y1="2" x2="6" y2="6"/>
      <line x1="8" y1="2" x2="10" y2="6"/>
      <line x1="6" y1="6" x2="8" y2="14"/>
      <line x1="10" y1="6" x2="8" y2="14"/>
    </svg>`,
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    color: '#7C3AED',
    defaultHours: 4,
    // Wind/wave lines — motion streaks
    svgIcon: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
      <path d="M2 5c2-1.5 4 1.5 6 0s4 1.5 6 0"/>
      <path d="M2 8.5c2-1.5 4 1.5 6 0s4 1.5 6 0"/>
      <path d="M2 12c2-1.5 4 1.5 6 0s4 1.5 6 0"/>
    </svg>`,
  },
  {
    id: 'copilot',
    name: 'Copilot',
    color: '#6E40C9',
    defaultHours: 24,
    // Pilot wings — badge wings
    svgIcon: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="8" cy="8" r="2"/>
      <path d="M6 8C4 6.5 1.5 7 1.5 7s1 2 2.5 3"/>
      <path d="M10 8c2-1.5 4.5-1 4.5-1s-1 2-2.5 3"/>
    </svg>`,
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
