# SomniaScope — Reactive Blockchain Intelligence Platform

## Overview
Enterprise-grade real-time analytics & monitoring platform for Somnia blockchain. Combines **3D globe visualization**, **on-chain Reactive smart contracts**, and **live blockchain data** into an immersive intelligence dashboard. Think **Dune Analytics meets Etherscan meets NASA Mission Control** — built natively on Somnia.

---

## Somnia Testnet Config

| Key | Value |
|-----|-------|
| **Chain ID** | `50312` |
| **RPC** | `https://dream-rpc.somnia.network` |
| **Native Token** | STT (Somnia Testnet Token) |
| **Faucet** | `https://testnet.somnia.network/` |
| **Explorer** | `https://shannon.somnia.network/` |
| **Reactivity Contracts** | `@somnia-chain/reactivity-contracts` |
| **Streams SDK** | `@somnia-chain/streams` |

---

## Project Structure (Monorepo)

```
somniascope/
├── contracts/                    # Solidity Smart Contracts
│   ├── src/
│   │   ├── WhaleDetector.sol     # Reactive whale movement detection
│   │   ├── AlertEngine.sol       # Custom user alert rules engine
│   │   ├── EventAggregator.sol   # On-chain event statistics
│   │   └── ScopeRegistry.sol     # User profiles & subscriptions
│   ├── test/
│   ├── hardhat.config.js
│   └── package.json
│
├── frontend/                     # Next.js Web Application
│   ├── src/
│   │   ├── app/                  # Next.js App Router pages
│   │   │   ├── page.tsx          # Dashboard (main)
│   │   │   ├── explorer/        # Block/Transaction Explorer
│   │   │   ├── whales/          # Whale Tracker
│   │   │   ├── alerts/          # Custom Alert Builder
│   │   │   └── portfolio/       # Wallet Portfolio Tracker
│   │   ├── components/
│   │   │   ├── globe/           # Three.js 3D Globe
│   │   │   ├── charts/          # Analytics charts
│   │   │   ├── layout/          # Sidebar, Header, etc.
│   │   │   └── ui/              # Reusable UI components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── lib/                 # Utils, contracts, providers
│   │   └── styles/
│   ├── public/
│   ├── next.config.js
│   └── package.json
│
├── README.md
└── package.json                  # Workspace root
```

---

## Smart Contracts (Solidity + Somnia Reactivity)

### 1. WhaleDetector.sol
**Purpose:** Otomatis mendeteksi transaksi besar (whale movements) dan emit alert.

```solidity
// Conceptual pseudocode
contract WhaleDetector is SomniaEventHandler {
    uint256 public threshold = 10000 ether;
    
    event WhaleAlert(address indexed from, address indexed to, uint256 amount, uint256 timestamp);
    
    // Auto-triggered by Somnia when Transfer events > threshold
    function _onEvent(bytes memory eventData) internal override {
        (address from, address to, uint256 amount) = decode(eventData);
        if (amount >= threshold) {
            emit WhaleAlert(from, to, amount, block.timestamp);
            // Auto-log ke on-chain registry
        }
    }
}
```

### 2. AlertEngine.sol
**Purpose:** User bisa buat custom alert rules on-chain. Saat rule terpenuhi, `_onEvent()` otomatis fire.

### 3. EventAggregator.sol
**Purpose:** Otomatis hitung statistik (total tx per block, gas used, active addresses) secara on-chain dan reaktif.

### 4. ScopeRegistry.sol
**Purpose:** User profiles, subscription tiers, dan watchlist management on-chain.

---

## Frontend Pages

### Page 1: 🌐 Dashboard (Home)
**Route:** `/`
**Deskripsi:** Command center utama — real-time overview seluruh Somnia blockchain.

| Section | Detail |
|---------|--------|
| **3D Globe** | Three.js globe menampilkan transaksi live (node positions berdasarkan validator/wallet geography) |
| **Live Stats Bar** | TPS, Gas Price, Block Height, Active Wallets — semua real-time |
| **Transaction Feed** | Stream transaksi terbaru dengan filter dan search |
| **Network Health** | Gauge charts: throughput, latency, block fill rate |
| **Whale Alert Ticker** | Scrolling ticker bar notifikasi whale movements |

### Page 2: 🔍 Explorer
**Route:** `/explorer`
**Deskripsi:** Block & Transaction explorer — Etherscan-level detail.

| Section | Detail |
|---------|--------|
| **Block List** | Paginated blocks dengan gas used, tx count, validator |
| **Transaction Detail** | Decode input data, internal calls, event logs |
| **Address Profile** | Balance, token holdings, transaction history |
| **Contract Viewer** | ABI viewer, read/write functions, event log |

### Page 3: 🐋 Whale Tracker
**Route:** `/whales`
**Deskripsi:** Real-time tracking whale wallets dan large movements. **Powered by Reactive smart contract.**

| Section | Detail |
|---------|--------|
| **Whale Feed** | Live feed dari WhaleDetector contract events |
| **Top Wallets** | Ranking wallet berdasarkan balance, sorted real-time |
| **Flow Visualization** | Interactive graph showing token flow antar whale wallets |
| **Watchlist** | User bisa "follow" wallet tertentu → on-chain subscription |

### Page 4: 🔔 Alert Builder
**Route:** `/alerts`
**Deskripsi:** Visual rule builder — buat custom on-chain alerts tanpa coding. **Core Reactivity showcase.**

| Section | Detail |
|---------|--------|
| **Rule Builder UI** | "When [event] from [address] where [amount > X] → Alert" |
| **Active Alerts** | Daftar rules yang sedang aktif on-chain |
| **Alert History** | Log semua alerts yang sudah ter-trigger |
| **Templates** | Pre-made templates (Whale alert, Price alert, Contract activity) |

### Page 5: 💼 Portfolio
**Route:** `/portfolio`
**Deskripsi:** Connect wallet → lihat aset, history, P&L.

| Section | Detail |
|---------|--------|
| **Wallet Connect** | MetaMask / WalletConnect integration |
| **Asset Overview** | Token balances dengan USD value (kalau ada oracle) |
| **Transaction History** | Sortable, filterable tx history |
| **Gas Analytics** | Berapa gas yang sudah dihabiskan over time |

---

## Tech Stack

### Frontend
| Tech | Purpose |
|------|---------|
| **Next.js 14+** | React framework (App Router, SSR) |
| **TypeScript** | Type safety |
| **Three.js + React Three Fiber** | 3D globe visualization |
| **TailwindCSS** | Styling |
| **Framer Motion** | Animations |
| **Recharts / visx** | Charts & graphs |
| **wagmi + viem** | Wallet connection + contract interaction |
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

### Phase 1: Foundation (Smart Contracts + Project Setup)
- [ ] Init monorepo (npm workspaces)
- [ ] Setup Hardhat project + Somnia Testnet config
- [ ] Write `WhaleDetector.sol` with `SomniaEventHandler`
- [ ] Write `AlertEngine.sol` with custom rule system
- [ ] Write `EventAggregator.sol`
- [ ] Deploy all contracts to Somnia Testnet
- [ ] Write unit tests

### Phase 2: Frontend Core (Next.js + Layout)
- [ ] Init Next.js 14 with TypeScript + TailwindCSS
- [ ] Design system (CSS tokens, dark theme, glassmorphism)
- [ ] Layout: Sidebar navigation + Header + Main content area
- [ ] Wallet connection (wagmi + MetaMask)
- [ ] Contract hooks (read/write smart contracts)

### Phase 3: Dashboard + 3D Globe
- [ ] Three.js globe with React Three Fiber
- [ ] Real-time transaction visualization on globe
- [ ] Live stats bar (TPS, Gas, Block Height)
- [ ] Transaction feed component
- [ ] Network health gauges

### Phase 4: Explorer
- [ ] Block list page (paginated)
- [ ] Transaction detail page
- [ ] Address profile page
- [ ] Contract viewer page

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
- [ ] Pre-made templates

### Phase 7: Portfolio
- [ ] Wallet connect + token balance display
- [ ] Transaction history
- [ ] Gas analytics chart
- [ ] P&L calculation

### Phase 8: Polish & Submission
- [ ] Demo video recording (2-5 minutes)
- [ ] README documentation
- [ ] Performance optimization
- [ ] Responsive design
- [ ] Final deploy to Vercel + Somnia Testnet

---

## Verification Plan

### Automated Tests
- Hardhat unit tests for all smart contracts
- `npx hardhat test` with coverage
- Frontend: build check `npm run build`

### Manual Verification
- Deploy to Somnia Testnet and interact via MetaMask
- Whale detection test: send large STT transfer → verify auto-alert on frontend
- Alert builder test: create rule → trigger condition → verify alert fires
- Globe test: verify transactions appear in real-time on 3D map
- Cross-browser testing (Chrome, Firefox, Edge)
