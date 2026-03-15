# 🔍 Analisis: Somnia Reactivity Mini Hackathon

## 1. Info Hackathon

| Aspek | Detail |
|-------|--------|
| **Nama** | Somnia Reactivity Mini Hackathon |
| **Platform** | DoraHacks |
| **Prize Pool** | $3,000 USD |
| **Deadline** | ~20-21 Maret 2026 (**5 hari lagi!**) |
| **Format** | Virtual |
| **Peserta** | 256 Hackers, 19 BUIDLs (submissions) |
| **Tags** | AI, Web3, Crypto, Reactivity |
| **Ecosystem** | Somnia Network |

---

## 2. Syarat Submission

| # | Requirement | Detail |
|---|-------------|--------|
| 1 | **GitHub Repo** | Public repo (GitHub/GitLab/Bitbucket) dengan README yang menjelaskan penggunaan Reactivity |
| 2 | **Working dApp** | Web3 dApp yang **sudah deploy ke Somnia Testnet** |
| 3 | **Demo Video** | 2-5 menit durasi |
| 4 | **Somnia Reactivity** | Wajib menggunakan SDK reactivity secara bermakna (bukan sekadar tempel) |

---

## 3. Apa Itu Somnia Reactivity?

### Konsep Inti
Blockchain tradisional itu **pasif** — smart contract hanya jalan kalau ada transaksi dari user. Somnia Reactivity membalik paradigma ini: **smart contract bisa "bangun sendiri"** dan otomatis eksekusi logika ketika event tertentu terjadi di on-chain.

### Cara Kerja
```
User → Transaksi → Event Emitted → Validator Mendeteksi → _onEvent() Auto-Fired → State Update
```

### Contoh Kode Solidity
```solidity
import { SomniaEventHandler } from "@somnia-chain/reactivity-contracts/contracts/SomniaEventHandler.sol";

contract MyReactiveApp is SomniaEventHandler {
    // Fungsi ini dipanggil OTOMATIS oleh blockchain saat event tertentu terjadi
    function _onEvent(bytes memory eventData) internal override {
        // Logika reaksi otomatis di sini
        // Contoh: auto-liquidate, auto-reward, auto-alert
    }
}
```

### Keunggulan
- **Real-time:** Reaksi terjadi di block yang sama
- **Trustless:** Tidak perlu server backend/cron job
- **Gas-efficient:** Lebih murah daripada polling terus-menerus
- **MEV Resistant:** Deterministic inclusion

---

## 4. Kompetisi

| Aspek | Analisis |
|-------|----------|
| **Peserta** | 256 hackers, tapi hanya **19 submissions** (konversi 7.4%) |
| **Prize** | $3,000 total — kemungkinan dibagi 3-5 winners |
| **Rasio** | ~19 submissions bersaing untuk ~$3K. Peluang cukup baik! |
| **Inspirasi resmi** | DeFi (liquidation engines), Analytics dashboards, On-chain trackers, Gaming, Automation |

---

## 5. ⚠️ Risiko & Tantangan

| Risiko | Level | Detail |
|--------|-------|--------|
| **Waktu sangat terbatas** | 🔴 | Hanya **5 hari** tersisa |
| **Belajar Solidity + SDK baru** | 🟡 | Perlu familiar dengan Solidity dan Somnia SDK |
| **Deploy ke Testnet** | 🟡 | Perlu setup Hardhat/Foundry + wallet funding dari faucet |
| **Demo Video** | 🟢 | 2-5 menit, bisa pakai screen recording |
| **Kompetisi rendah** | 🟢 | Hanya 19 submissions = peluang menang lebih tinggi |

---

## 6. 💡 Pendapat Saya

### Apakah Layak Diikuti?
**Ya, sangat layak.** Alasannya:
1. **Kompetisi rendah** — Hanya 19 submissions dari 256 peserta. Banyak yang mendaftar tapi tidak submit.
2. **Prize pool terjangkau** — $3K dibagi beberapa pemenang, tapi effort-nya juga proporsional (mini hackathon).
3. **Portfolio value** — Blockchain project di portfolio Anda akan sangat meningkatkan nilai sebagai developer.
4. **Belajar Web3** — Exposure ke Solidity, smart contracts, dan ekosistem Web3 yang sedang berkembang.

### Tantangan Utama
1. **5 hari sangat ketat** — Anda harus realistis tentang scope. Buat MVP sederhana yang benar-benar bekerja, bukan fitur banyak tapi setengah jadi.
2. **Perlu belajar Solidity basics** — Jika belum pernah, ini bisa memakan 1-2 hari sendiri.
3. **Somnia SDK masih baru** — Dokumentasi mungkin terbatas, tapi ada Discord support dari tim Somnia.

### Saran Strategi
> [!IMPORTANT]
> **Jangan rombak project vibecode-monitor untuk ini.** Buat project **baru dari nol** yang lebih ringkas. 5 hari terlalu singkat untuk mengubah codebase yang sudah ada menjadi blockchain project. Lebih baik mulai fresh dengan scope kecil dan fokus.

---

## 7. 🎯 3 Ide Project (Realistis untuk 5 Hari)

### Ide A: "ChainPulse" — Real-Time On-Chain Event Dashboard
**Konsep:** Dashboard yang menampilkan aktivitas blockchain Somnia secara real-time. Smart contract mendengarkan event (transfer, mint, swap) dan otomatis memicu visualisasi di frontend.

| Aspek | Detail |
|-------|--------|
| **Reactivity Usage** | Smart contract subscribe ke event ERC-20/ERC-721, auto-aggregate data |
| **Frontend** | Three.js globe (bisa reuse skill kamu!) + live event feed |
| **Complexity** | ⭐⭐⭐ Medium |
| **Wow Factor** | 🔥🔥🔥🔥 Tinggi (visual + real-time) |
| **Feasibility (5 hari)** | ✅ Bisa |

---

### Ide B: "ReactiveVault" — Auto-Rebalancing DeFi Vault
**Konsep:** Smart contract vault yang otomatis rebalance portfolio ketika harga aset berubah melewati threshold tertentu. Tidak perlu keeper bot — blockchain itu sendiri yang meng-execute rebalancing.

| Aspek | Detail |
|-------|--------|
| **Reactivity Usage** | `_onEvent()` dipanggil saat price oracle update → auto-swap |
| **Frontend** | Dashboard simpel showing vault stats |
| **Complexity** | ⭐⭐⭐⭐ High |
| **Wow Factor** | 🔥🔥🔥 |
| **Feasibility (5 hari)** | ⚠️ Ketat, butuh pengalaman DeFi |

---

### Ide C: "WhaleAlert Reactive" — On-Chain Whale Tracker
**Konsep:** Smart contract yang otomatis mendeteksi "whale movements" (transaksi besar) di Somnia dan memicu on-chain log + alert. Frontend menampilkan feed real-time.

| Aspek | Detail |
|-------|--------|
| **Reactivity Usage** | Subscribe ke Transfer events, filter by amount threshold |
| **Frontend** | Clean feed UI + notification |
| **Complexity** | ⭐⭐ Low-Medium |
| **Wow Factor** | 🔥🔥 |
| **Feasibility (5 hari)** | ✅✅ Sangat bisa |

---

## 8. Rekomendasi Saya

> [!TIP]
> Saya merekomendasikan **Ide A: "ChainPulse"** karena:
> 1. Anda sudah punya skill Three.js globe yang sangat kuat dari project ini
> 2. Visual dashboard + real-time data = kombinasi yang sangat "wow" untuk juri
> 3. Scope bisa dikontrol — mulai dari kecil, tambahkan seiring waktu
> 4. Cocok dengan tag hackathon: **AI + Web3 + Reactivity**

Bagaimana menurut Anda? Apakah Anda mau saya buatkan implementation plan yang detail untuk salah satu ide di atas, atau Anda punya ide sendiri?
