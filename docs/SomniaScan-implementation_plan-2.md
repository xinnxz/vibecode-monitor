# SomniaScan — Reactive Blockchain Intelligence Platform

## Overview
Enterprise-grade real-time analytics & monitoring platform untuk Somnia Network. Menggabungkan **3D Globe Visualization**, **On-Chain Reactive Smart Contracts**, dan **Live Blockchain Data** menjadi satu pengalaman dashboard imersif. Think **Dune Analytics meets Etherscan meets NASA Mission Control** — built natively on Somnia.

---

## Somnia Testnet Config
| Key | Value |
|-----|-------|
| **Chain ID** | `50312` |
| **RPC** | `https://dream-rpc.somnia.network` |
| **Native Token** | STT |
| **Faucet** | `https://testnet.somnia.network/` |
| **Explorer** | `https://shannon.somnia.network/` |
| **Reactivity Contracts** | `@somnia-chain/reactivity-contracts` |
| **Streams SDK** | `@somnia-chain/streams` |

---

## Project Structure (Monorepo)

```
somniascan/
├── contracts/
│   ├── src/
│   │   ├── WhaleDetector.sol     # Reactive whale detection (SomniaEventHandler)
│   │   ├── AlertEngine.sol       # Custom user alert rules
│   │   ├── EventAggregator.sol   # On-chain network stats aggregation
│   │   └── ScopeRegistry.sol     # User profiles & watchlists on-chain
│   ├── test/
│   ├── hardhat.config.js
│   └── package.json
│
├── frontend/                     # Next.js 14 Web Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Dashboard (Home)
│   │   │   ├── explorer/         # Block & Tx Explorer
│   │   │   ├── whales/           # Whale Tracker
│   │   │   ├── alerts/           # Custom Alert Builder
│   │   │   └── portfolio/        # Wallet Portfolio
│   │   ├── components/
│   │   │   ├── globe/            # Three.js 3D Globe
│   │   │   ├── charts/           # Analytics charts
│   │   │   ├── layout/           # Sidebar, Header, HUD
│   │   │   └── ui/               # Reusable UI components
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── styles/
│   ├── public/
│   ├── next.config.js
│   └── package.json
│
├── README.md
└── package.json                  # Workspace root
```

---

## 🌟 Fitur Lengkap

### Page 1: 🌐 Dashboard (Mission Control Center)
**Route:** `/` — Command center utama blockchain Somnia real-time.

| Section | Detail |
|---------|--------|
| **3D Globe** | Globe Three.js live — setiap transaksi = animasi Ping + Laser FlyArc |
| **Live Node Ping** | Titik di globe menyala terang saat ada tx baru masuk |
| **FlyArc (Laser)** | Garis cahaya melengkung dari pengirim ke penerima, warna sesuai nilai tx |
| **Whale Pulse Alert** | Saat `_onEvent()` Sentinel api, globe meledak warna merah + Spatial Audio Siren |
| **Live Stats HUD** | TPS, Gas Price, Block Height, Active Wallets — semua real-time di layar |
| **Transaction Feed** | Terminal sidebar scrolling berisi Hash Tx terbaru (gaya activity-log) |
| **Network Health** | Gauge charts: throughput, latency, block fill rate |
| **Whale Alert Ticker** | Scrolling ticker bar notifikasi whale movements di bagian bawah layar |

### Page 2: 🔍 Explorer
**Route:** `/explorer` — Etherscan-level detail, bukan tabel biasa.

| Section | Detail |
|---------|--------|
| **Block List** | Paginated blocks dengan gas used, tx count, validator |
| **Transaction Detail** | Decode input data, internal calls, event logs |
| **Address Profile** | Balance, token holdings, transaction history |
| **Contract Viewer** | ABI viewer, read/write functions, event log |

### Page 3: 🐋 Whale Tracker
**Route:** `/whales` — Powered by `WhaleDetector.sol` (Reactivity).

| Section | Detail |
|---------|--------|
| **Whale Feed** | Live feed dari WhaleDetector contract events |
| **Top Wallets** | Ranking wallet berdasarkan balance, sorted real-time |
| **Flow Graph** | Interactive graph aliran token antar whale wallets |
| **Watchlist** | Follow wallet tertentu → on-chain subscription |

### Page 4: 🔔 Alert Builder
**Route:** `/alerts` — Visual rule builder **tanpa coding**. Core Reactivity showcase.

| Section | Detail |
|---------|--------|
| **Rule Builder UI** | `"When [event] from [address] where [amount > X] → Alert"` |
| **Active Alerts** | Daftar rules aktif on-chain |
| **Alert History** | Log semua alerts yang sudah trigger |
| **Templates** | Pre-made: Whale alert, Price alert, Contract activity |

### Page 5: 💼 Portfolio
**Route:** `/portfolio` — Connect wallet → lihat aset, history, P&L.

| Section | Detail |
|---------|--------|
| **Wallet Connect** | MetaMask / WalletConnect |
| **Asset Overview** | Token balances |
| **Transaction History** | Sortable, filterable tx history |
| **Gas Analytics** | Total gas spent over time |

---

## 🛡️ Smart Contracts (The Intelligence Layer)

### 1. WhaleDetector.sol (Reactivity Core)
```solidity
contract WhaleDetector is SomniaEventHandler {
    uint256 public threshold = 10000 ether;
    event WhaleAlert(address indexed from, address indexed to, uint256 amount, uint256 timestamp);

    // Auto-triggered by Somnia when Transfer events > threshold
    function _onEvent(bytes memory eventData) internal override {
        (address from, address to, uint256 amount) = decode(eventData);
        if (amount >= threshold) {
            emit WhaleAlert(from, to, amount, block.timestamp);
        }
    }
}
```

### 2. AlertEngine.sol
User buat custom alert rules on-chain. Saat rule terpenuhi → `_onEvent()` auto-fire.

### 3. EventAggregator.sol
Otomatis hitung statistik (total tx per block, gas used, active addresses) on-chain secara reaktif.

### 4. ScopeRegistry.sol
User profiles, subscription tiers, dan watchlist management on-chain.

---

## 🎛️ "Wow Factor" Khusus

| Visual Effect | Trigger | Implementasi |
|--------------|---------|-------------|
| **Node Ping** | Setiap tx baru masuk | Animasi flash di titik globe ([createWaveMesh](file:///e:/DATA/Ngoding/vibecode-monitor/src/globe-utils.js#129-162) kecil) |
| **Laser FlyArc** | Setiap tx normal | [flyArc()](file:///e:/DATA/Ngoding/vibecode-monitor/src/globe-utils.js#239-266) dari [globe-utils.js](file:///e:/DATA/Ngoding/vibecode-monitor/src/globe-utils.js) warna sesuai nilai |
| **Red Wave Pulse** | Whale Alert dari Reactivity | [createWaveMesh](file:///e:/DATA/Ngoding/vibecode-monitor/src/globe-utils.js#129-162) besar merah berkedip agresif |
| **Spatial Audio Siren** | Whale Alert | Web Audio API: sirene sci-fi, stereo panning |
| **Ticker Scroll** | Setiap block baru | Scrolling bar bawah layar khas bursa saham |

---

## Tech Stack

### Frontend
| Tech | Purpose |
|------|---------|
| **Next.js 14+** | React framework (App Router, SSR) |
| **TypeScript** | Type safety |
| **Three.js + React Three Fiber** | 3D globe |
| **TailwindCSS** | Styling |
| **Framer Motion** | Animations |
| **Recharts / visx** | Charts & graphs |
| **wagmi + viem** | Wallet + contract interaction |
| **@tanstack/react-query** | Data fetching & caching |

### Smart Contracts
| Tech | Purpose |
|------|---------|
| **Solidity ^0.8.x** | Smart contract language |
| **Hardhat** | Development framework |
| **@somnia-chain/reactivity-contracts** | Reactivity base contracts |
| **@somnia-chain/streams** | Real-time data stream SDK |
| **OpenZeppelin** | Standard security patterns |

### Infra
| Tech | Purpose |
|------|---------|
| **Somnia Testnet** | Deployment target |
| **ethers.js / viem** | Blockchain interaction |
| **Vercel** | Frontend hosting |

---

## Phased Execution Plan

### Phase 1: Foundation (Smart Contracts)
- [ ] Init monorepo (npm workspaces)
- [ ] Setup Hardhat + Somnia Testnet config
- [ ] Write `WhaleDetector.sol` with `SomniaEventHandler`
- [ ] Write `AlertEngine.sol`
- [ ] Write `EventAggregator.sol`
- [ ] Write `ScopeRegistry.sol`
- [ ] Deploy all contracts to Somnia Testnet
- [ ] Unit tests

### Phase 2: Frontend Core
- [ ] Init Next.js 14 + TypeScript + TailwindCSS
- [ ] Design system (dark theme, glassmorphism)
- [ ] Layout: Sidebar + Header + HUD
- [ ] Wallet connection (wagmi + MetaMask)
- [ ] Contract hooks (read/write)

### Phase 3: Dashboard + 3D Globe
- [ ] Three.js globe with React Three Fiber
- [ ] Real-time transaction Node Ping animation
- [ ] FlyArc Laser animation per transaction
- [ ] Red Wave Pulse on Whale Alert
- [ ] Spatial Audio Siren on Whale Alert
- [ ] Live Stats HUD (TPS, Gas, Block Height)
- [ ] Transaction Terminal Feed

### Phase 4: Explorer Page
- [ ] Block list (paginated)
- [ ] Transaction detail
- [ ] Address profile
- [ ] Contract viewer

### Phase 5: Whale Tracker (Reactive)
- [ ] WhaleDetector event listener on frontend
- [ ] Live whale feed UI
- [ ] Top wallets ranking
- [ ] Token flow graph visualization
- [ ] Wallet watchlist (on-chain subscription)

### Phase 6: Alert Builder (Reactive)
- [ ] Visual rule builder UI
- [ ] Create alert rules via smart contract
- [ ] Active alerts dashboard
- [ ] Alert history log
- [ ] Pre-made alert templates

### Phase 7: Portfolio
- [ ] Wallet connect + token balance display
- [ ] Transaction history
- [ ] Gas analytics chart
- [ ] P&L calculation

### Phase 8: Polish & Submission
- [ ] Demo video (2-5 min)
- [ ] README documentation
- [ ] Performance optimization
- [ ] Responsive design
- [ ] Final deploy Vercel + Somnia Testnet

---

## Verification Plan

### Automated Tests
- `npx hardhat test` (unit tests + coverage)
- `npm run build` (frontend build check)

### Manual Verification
- Deploy ke Somnia Testnet, interaction via MetaMask
- Whale detection test: kirim transfer besar → verify `_onEvent()` terpanggil → verify Red Wave Pulse muncul di frontend
- Alert builder test: buat rule → trigger kondisinya → verify alert fire
- Globe animation FPS test: pastikan ≥30 FPS dengan 50+ animasi/detik
- Cross-browser: Chrome, Firefox, Edge
