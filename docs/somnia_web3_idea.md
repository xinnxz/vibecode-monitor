# 🚀 Ide Web3 Somnia untuk Vibe Code Monitor
## "VibeChain Monitor" — On-Chain AI Quota Tracker with Somnia Reactivity

---

## 🎯 Executive Summary

Ubah **Vibe Code Monitor** menjadi **VibeChain Monitor** — sebuah dApp Web3 pertama di dunia yang mencatat penggunaan kuota AI coding tools (Cursor, Claude, ChatGPT, dll) ke blockchain Somnia secara on-chain, dengan notifikasi real-time berbasis Somnia Reactivity tanpa polling.

---

## 💡 Konsep Inti: "Proof of Vibe"

> **Tagline:** *"Your AI usage, immortalized on-chain. No more guessing. No more context-switching."*

Setiap kali kamu:
- ✅ Menandai akun AI sebagai "limited" (habis kuota)
- ✅ Akun kembali "available" (kuota reset)
- ✅ Menambah/menghapus akun AI

...semua event ini **ditulis ke Somnia blockchain** sebagai immutable record. Smart contract kemudian **bereaksi otomatis** via Somnia Reactivity untuk:
1. Memperbarui status di semua device secara real-time
2. Menghitung statistik on-chain (berapa kali kamu "vibe coding" hari ini)
3. Minting "Vibe Score" NFT badge berdasarkan aktivitas

---

## 🏗️ Arsitektur Teknis

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Existing)                   │
│  Three.js Globe + Matrix Rain + Sci-Fi UI               │
│  (Vibe Code Monitor yang sudah ada)                     │
└──────────────────┬──────────────────────────────────────┘
                   │ ethers.js / viem
                   ▼
┌─────────────────────────────────────────────────────────┐
│              SOMNIA TESTNET (New Layer)                  │
│                                                         │
│  ┌─────────────────────┐  ┌──────────────────────────┐ │
│  │  VibeTracker.sol    │  │  VibeReactor.sol         │ │
│  │  (Main Contract)    │  │  (SomniaEventHandler)    │ │
│  │                     │  │                          │ │
│  │  - logUsage()       │  │  - _onEvent()            │ │
│  │  - setStatus()      │  │    → auto-update state   │ │
│  │  - getVibeScore()   │  │    → emit notifications  │ │
│  │  - mintBadge()      │  │    → update leaderboard  │ │
│  └─────────────────────┘  └──────────────────────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Somnia Reactivity SDK (Off-chain WebSocket)    │   │
│  │  sdk.subscribe() → onData callback              │   │
│  │  → Push ke frontend tanpa polling               │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Komponen yang Dibangun

### 1. Smart Contract: `VibeTracker.sol`
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VibeTracker {
    struct AccountLog {
        address owner;
        string provider;    // "claude", "cursor", "chatgpt"
        string status;      // "limited", "available"
        uint256 timestamp;
        uint256 vibeScore;
    }
    
    mapping(address => AccountLog[]) public userLogs;
    mapping(address => uint256) public vibeScores;
    
    event StatusChanged(
        address indexed user,
        string provider,
        string oldStatus,
        string newStatus,
        uint256 timestamp
    );
    
    event VibeScoreUpdated(address indexed user, uint256 newScore);
    
    function logStatusChange(
        string memory provider,
        string memory oldStatus, 
        string memory newStatus
    ) external {
        // Catat ke blockchain
        userLogs[msg.sender].push(AccountLog({
            owner: msg.sender,
            provider: provider,
            status: newStatus,
            timestamp: block.timestamp,
            vibeScore: vibeScores[msg.sender]
        }));
        
        // Update vibe score
        if (keccak256(bytes(newStatus)) == keccak256(bytes("available"))) {
            vibeScores[msg.sender] += 10; // +10 poin setiap akun ready
        }
        
        emit StatusChanged(msg.sender, provider, oldStatus, newStatus, block.timestamp);
        emit VibeScoreUpdated(msg.sender, vibeScores[msg.sender]);
    }
    
    function getVibeScore(address user) external view returns (uint256) {
        return vibeScores[user];
    }
    
    function getUserLogs(address user) external view returns (AccountLog[] memory) {
        return userLogs[user];
    }
}
```

### 2. Smart Contract: `VibeReactor.sol` (Somnia Reactivity)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@somnia-chain/reactivity-contracts/contracts/SomniaEventHandler.sol";

contract VibeReactor is SomniaEventHandler {
    address public vibeTracker;
    
    mapping(address => uint256) public lastReactionTime;
    mapping(address => string) public currentStatus;
    
    event ReactiveAlert(address indexed user, string message, uint256 timestamp);
    
    constructor(address _vibeTracker) {
        vibeTracker = _vibeTracker;
    }
    
    // Dipanggil OTOMATIS oleh Somnia saat event StatusChanged terjadi
    function _onEvent(bytes memory eventData) internal override {
        (address user, string memory provider, string memory newStatus, uint256 timestamp) 
            = abi.decode(eventData, (address, string, string, uint256));
        
        lastReactionTime[user] = block.timestamp;
        currentStatus[user] = newStatus;
        
        // Auto-emit alert ke semua subscriber
        if (keccak256(bytes(newStatus)) == keccak256(bytes("available"))) {
            emit ReactiveAlert(
                user,
                string(abi.encodePacked(provider, " is now AVAILABLE! Time to vibe code!")),
                timestamp
            );
        }
    }
}
```

### 3. Frontend Integration: `src/web3.js` (New File)
```javascript
import { createPublicClient, createWalletClient, http } from 'viem';
import { SDK } from '@somnia-chain/reactivity';

// Somnia Testnet config
const somniaTestnet = {
  id: 50312,
  name: 'Somnia Testnet',
  rpcUrls: { default: { http: ['https://dream-rpc.somnia.network'] } }
};

// Subscribe ke event on-chain via Reactivity
export async function subscribeToVibeEvents(onAccountReady) {
  const sdk = new SDK({ publicClient, walletClient });
  
  await sdk.subscribe({
    ethCalls: [{
      address: VIBE_TRACKER_ADDRESS,
      abi: VibeTrackerABI,
      functionName: 'getVibeScore',
      args: [userAddress]
    }],
    onData: (data) => {
      // Dipanggil OTOMATIS tanpa polling!
      onAccountReady(data);
    }
  });
}
```

---

## 🎮 Fitur Unik yang Membedakan dari Kompetitor

### 1. 🏆 "Vibe Score" Leaderboard On-Chain
- Setiap kali akun AI kamu reset (available), kamu dapat **+10 Vibe Points**
- Points disimpan on-chain di Somnia — **immutable, trustless, verifiable**
- Leaderboard global: siapa yang paling produktif vibe coding hari ini?
- Globe 3D menampilkan **top vibers** sebagai bintang terang di peta dunia

### 2. ⚡ Reactive Notifications (Killer Feature)
- Tanpa polling, tanpa server — Somnia Reactivity **push** notifikasi langsung
- Saat akun Claude kamu reset di device A → device B langsung tahu dalam **milliseconds**
- Ini yang membedakan dari Supabase Realtime biasa: **trustless & on-chain**

### 3. 🎖️ "Proof of Vibe" NFT Badges
- Capai 100 Vibe Points → Mint NFT badge "Junior Vibe Coder"
- Capai 500 Points → "Senior Vibe Coder"  
- Capai 1000 Points → "Vibe God" 🔥
- NFT disimpan di Somnia, bisa dipamerkan di wallet

### 4. 📊 On-Chain Analytics Dashboard
- Semua history penggunaan AI tersimpan on-chain
- Visualisasi: "Kamu paling sering limit di jam berapa?"
- "Provider mana yang paling sering kamu pakai?"
- Data ini **tidak bisa dihapus** — permanent record of your vibe coding journey

### 5. 🌐 Globe 3D → "Vibe World Map"
- Setiap user yang connect wallet = satu titik di globe
- Warna titik = status akun mereka (hijau = available, merah = limited)
- Real-time update via Somnia Reactivity — globe bergerak sendiri!
- **Ini adalah visual yang akan membuat juri terpesona**

---

## 📅 Timeline Realistis (5 Hari)

### Hari 1: Setup & Smart Contract
- [ ] Setup Hardhat/Foundry + Somnia Testnet
- [ ] Tulis & deploy `VibeTracker.sol`
- [ ] Test di Somnia Testnet
- [ ] Dapatkan test SOM dari faucet

### Hari 2: Somnia Reactivity Integration
- [ ] Install `@somnia-chain/reactivity` SDK
- [ ] Tulis `VibeReactor.sol` (SomniaEventHandler)
- [ ] Deploy & test reactive subscription
- [ ] Buat `src/web3.js` di frontend

### Hari 3: Frontend Integration
- [ ] Connect wallet (MetaMask/WalletConnect)
- [ ] Hook `logStatusChange()` ke existing account CRUD
- [ ] Tampilkan Vibe Score di UI
- [ ] Real-time update via Reactivity SDK

### Hari 4: Polish & Extra Features
- [ ] Leaderboard on-chain
- [ ] Globe update real-time dari blockchain
- [ ] NFT badge minting (opsional, jika waktu cukup)
- [ ] Error handling & loading states

### Hari 5: Demo & Submission
- [ ] Record demo video 2-5 menit
- [ ] Update README dengan penjelasan Reactivity usage
- [ ] Submit ke DoraHacks

---

## 🎯 Kenapa Ide Ini Akan Menang?

### Diferensiasi dari 19 Submissions Lain:
1. **Use case nyata** — Bukan DeFi/gaming generik. Ini tool yang developer BENAR-BENAR butuhkan
2. **Visual yang luar biasa** — Three.js globe + matrix rain = demo video yang memorable
3. **Reactivity usage yang meaningful** — Bukan sekadar "tempel" SDK, tapi benar-benar menggantikan polling
4. **Potensi produk nyata** — Juri akan melihat ini bisa jadi produk sesungguhnya
5. **Storytelling kuat** — "Saya membangun ini karena saya sendiri butuh tool ini"

### Kriteria Penilaian vs Ide Kita:
| Kriteria | Score | Alasan |
|----------|-------|--------|
| Keunggulan Teknis | ⭐⭐⭐⭐⭐ | Smart contract + Reactivity SDK + Three.js = stack yang impressive |
| UX Real-Time | ⭐⭐⭐⭐⭐ | Globe bergerak real-time, notifikasi instant tanpa polling |
| Integrasi Somnia | ⭐⭐⭐⭐⭐ | Deploy di testnet + Reactivity SDK digunakan secara core |
| Potensi Dampak | ⭐⭐⭐⭐⭐ | Ribuan developer butuh tool ini, bisa jadi produk nyata |

---

## ⚠️ Risiko & Mitigasi

| Risiko | Level | Mitigasi |
|--------|-------|----------|
| Belajar Solidity dari nol | 🟡 | Smart contract kita sederhana, tidak perlu DeFi complexity |
| 32 SOM minimum untuk on-chain subscription | 🟡 | Gunakan off-chain WebSocket subscription dulu (lebih mudah) |
| Waktu 5 hari sangat ketat | 🔴 | Fokus MVP: wallet connect + log event + reactivity subscribe |
| Somnia SDK masih baru | 🟡 | Ada Discord support + dokumentasi cukup lengkap |

---

## 🔑 MVP Minimum (Jika Waktu Sangat Terbatas)

Jika 5 hari terasa terlalu ketat, ini adalah **minimum viable submission**:

1. ✅ Smart contract `VibeTracker.sol` yang menyimpan status changes
2. ✅ Frontend connect wallet + call `logStatusChange()` saat status berubah
3. ✅ Somnia Reactivity **off-chain WebSocket** subscription (lebih mudah dari on-chain)
4. ✅ Tampilkan Vibe Score di UI
5. ✅ Deploy ke Somnia Testnet

**Ini sudah cukup untuk submission yang valid dan kompetitif!**

---

## 🆚 Perbandingan dengan Ide Sebelumnya (dari hackathon_analysis.md)

| Aspek | Ide A (ChainPulse) | **VibeChain Monitor** |
|-------|-------------------|----------------------|
| Relevansi personal | Rendah (generic) | **Tinggi (tool kamu sendiri)** |
| Reuse existing code | Sebagian | **Hampir semua** |
| Storytelling | Biasa | **Kuat ("I built this for myself")** |
| Differensiasi | Medium | **Tinggi (niche yang unik)** |
| Feasibility 5 hari | ✅ | **✅✅ (lebih mudah karena reuse)** |

---

## 📝 Nama & Branding

- **Nama Project:** `VibeChain Monitor` atau `Vibe Code Monitor v2 — On-Chain Edition`
- **Tagline:** *"Your AI coding sessions, immortalized on Somnia blockchain"*
- **Logo concept:** Matrix rain + blockchain hexagon + globe

---

## 🚀 Kesimpulan

**Rekomendasi saya: Lanjutkan dengan VibeChain Monitor.**

Kamu tidak perlu membuang project yang sudah ada. Cukup **tambahkan layer Web3** di atas Vibe Code Monitor yang sudah keren ini:
- Supabase tetap jalan untuk data lokal (fast, reliable)
- Somnia blockchain untuk immutable record + Reactivity notifications
- Dua layer ini saling melengkapi, bukan menggantikan

Ini adalah **hybrid architecture** yang justru lebih impressive dari project yang pure blockchain saja.
