<div align="center">

# 🌐 Vibe Code Monitor

**The ultimate Account Limit & Quota Tracker for Vibe Coders.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Made for Vibe Coding](https://img.shields.io/badge/Made%20for-Vibe%20Coding-cyan)](#)
[![Three.js](https://img.shields.io/badge/3D-Three.js-green)](#)
[![Supabase](https://img.shields.io/badge/Database-Supabase-emerald)](#)

</div>

---

**Vibe Code Monitor** is a specialized, interactive dashboard built for high-productivity "vibe coders" who juggle multiple AI agent accounts (like Cursor, Claude, ChatGPT, and Gemini) and need a centralized place to monitor rate limits, quotas, and refresh timers.

Tired of context-switching to check if your Claude Pro limit has reset? Or forgetting which Cursor account is currently active? Vibe Code Monitor tracks it all in a stunning, sci-fi "hacker terminal" interface featuring an interactive 3D space visualization.

## ✨ Key Features

- **⏱️ Automated Limit Tracking:** Set custom refresh timers for different AI providers (e.g., Cursor 24h, Claude 4h).
- **🪐 3D Galaxy Visualization:** Accounts are mapped as orbital satellites around an interactive 3D Earth, built with Three.js.
- **⚡ Real-time Sync:** Powered by Supabase. Update an account status on your phone, and watch it instantly sync on your desktop monitor.
- **🔔 Notification Center:** In-app matrix-style notifications when accounts become available.
- **🤖 Webhook Integrations:** (WIP) Native support for Discord and Telegram alerts so you're notified the second an account is ready to prompt again.
- **📋 Quick-Copy Credentials:** One-click copy for emails and API keys straight from the tracker cards.
- **🏷️ Tag Management:** Categorize your accounts by provider, project, or environment.

## 🚀 Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/vibecode-monitor.git
   cd vibecode-monitor
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Copy the example environment file and add your Supabase credentials:
   ```bash
   cp .env.example .env.local
   ```
   *(Ensure you have set up the required tables in Supabase as per `docs/FEATURES_ROADMAP.md`)*

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Initialize to the matrix:** Open `http://localhost:5173` and click anywhere to boot up the terminal.

## 🎨 Aesthetic & UI/UX

The interface is intentionally aggressive and futuristic, utilizing CSS CRT scanlines, a deep NASA-image nebula skybox, blinking terminal cursors, and ambient space soundscapes. It isn't just a tool; it's an immersive environment designed to keep you in the "flow state" of vibe coding.

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## 🛡️ Security

If you discover any security-related issues, please refer to our [SECURITY.md](SECURITY.md) guidelines rather than using the issue tracker.

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for more information.

---

<div align="center">
  <i>"Hack the planet."</i>
</div>
