// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ============================================================
// EventAggregator.sol — SomniaScan
//
// Contract ini secara reaktif menghitung statistik jaringan
// Somnia secara on-chain. Setiap kali ada transfer terjadi,
// Somnia Reactivity memanggil _onEvent() untuk memperbarui
// semua statistik secara otomatis.
//
// Statistik yang dikumpulkan:
// - Total transaksi sepanjang waktu
// - Transaksi per hari (indexed by day)
// - Volume token total
// - Alamat aktif unik (per periode)
// - Ranking/leaderboard alamat tersibuk
//
// Semua data ini digunakan oleh frontend SomniaScan untuk
// menampilkan HUD (Head-Up Display) dan grafik realtime.
// ============================================================

import "@somnia-chain/reactivity-contracts/contracts/SomniaEventHandler.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EventAggregator is SomniaEventHandler, Ownable {
    // ============================================================
    // STATE VARIABLES — Network Statistics
    // ============================================================

    /// @notice Total transaksi STT yang sudah pernah tercatat.
    uint256 public totalTransactions;

    /// @notice Total volume token STT yang sudah berpindah (dalam wei).
    uint256 public totalVolumeWei;

    /// @notice Jumlah alamat unik yang pernah bertransaksi.
    uint256 public uniqueAddressCount;

    /// @notice Transaksi terbesar yang pernah tercatat (dalam wei).
    uint256 public largestTransactionEver;

    /// @notice Alamat pengirim dari transaksi terbesar.
    address public largestTxSender;

    /// @notice Timestamp saat contract di-deploy (awal perhitungan statistik).
    uint256 public immutable deployedAt;

    // ============================================================
    // STATE VARIABLES — Per-Day Statistics
    // ============================================================

    /// @notice tx count per hari. dayIndex = timestamp / 86400
    mapping(uint256 => uint256) public dailyTxCount;

    /// @notice volume per hari (dalam wei).
    mapping(uint256 => uint256) public dailyVolume;

    // ============================================================
    // STATE VARIABLES — Address Activity (Leaderboard)
    // ============================================================

    /// @notice Berapa kali setiap alamat bertransaksi.
    mapping(address => uint256) public addressTxCount;

    /// @notice Berapa total volume yang dikirim setiap alamat (wei).
    mapping(address => uint256) public addressVolume;

    /// @notice Apakah alamat ini sudah pernah bertransaksi?
    mapping(address => bool) public isKnownAddress;

    /// @notice Top 10 addresses berdasarkan tx count
    address[10] public topAddresses;

    // ============================================================
    // EVENTS
    // ============================================================

    /// @notice Dipanggil setiap kali statistik diperbarui.
    event StatsUpdated(
        uint256 totalTransactions,
        uint256 totalVolumeWei,
        uint256 uniqueAddressCount,
        uint256 timestamp
    );

    /// @notice Dipanggil saat ada transaksi terbesar baru.
    event NewLargestTransaction(
        address indexed sender,
        uint256 amount,
        uint256 timestamp
    );

    // ============================================================
    // CONSTRUCTOR
    // ============================================================

    constructor() Ownable(msg.sender) {
        deployedAt = block.timestamp;
    }

    // ============================================================
    // SOMNIA REACTIVITY CORE
    // ============================================================

    /**
     * @notice Auto-dipanggil oleh Somnia saat ada Transfer event.
     * @dev Update semua statistik jaringan secara atomik dalam satu blok.
     *      Tidak perlu manual trigger dari siapapun.
     */
    function _onEvent(bytes memory eventData) internal override {
        (address from, , uint256 amount) = abi.decode(
            eventData,
            (address, address, uint256)
        );

        // — Update global stats —
        totalTransactions++;
        totalVolumeWei += amount;

        // — Update daily stats —
        uint256 today = block.timestamp / 86400;
        dailyTxCount[today]++;
        dailyVolume[today] += amount;

        // — Update address activity —
        if (!isKnownAddress[from]) {
            isKnownAddress[from] = true;
            uniqueAddressCount++;
        }
        addressTxCount[from]++;
        addressVolume[from] += amount;

        // — Check largest transaction —
        if (amount > largestTransactionEver) {
            largestTransactionEver = amount;
            largestTxSender = from;
            emit NewLargestTransaction(from, amount, block.timestamp);
        }

        // — Update leaderboard —
        _updateTopAddresses(from);

        emit StatsUpdated(
            totalTransactions,
            totalVolumeWei,
            uniqueAddressCount,
            block.timestamp
        );
    }

    // ============================================================
    // VIEW FUNCTIONS
    // ============================================================

    /// @notice Kembalikan total volume dalam STT (bukan wei).
    function getTotalVolumeSTT() external view returns (uint256) {
        return totalVolumeWei / 1 ether;
    }

    /// @notice Kembalikan statistik hari ini.
    function getTodayStats() external view returns (uint256 txCount, uint256 volume) {
        uint256 today = block.timestamp / 86400;
        txCount = dailyTxCount[today];
        volume = dailyVolume[today];
    }

    /// @notice Kembalikan statistik N hari terakhir (max 30).
    function getRecentDailyStats(uint256 numDays)
        external
        view
        returns (uint256[] memory txCounts, uint256[] memory volumes)
    {
        require(numDays <= 30, "Maksimum 30 hari");
        uint256 today = block.timestamp / 86400;
        txCounts = new uint256[](numDays);
        volumes = new uint256[](numDays);
        for (uint256 i = 0; i < numDays; i++) {
            uint256 day = today - i;
            txCounts[i] = dailyTxCount[day];
            volumes[i] = dailyVolume[day];
        }
    }

    /// @notice Kembalikan Top 10 alamat.
    function getTopAddresses() external view returns (address[10] memory) {
        return topAddresses;
    }

    // ============================================================
    // INTERNAL HELPERS
    // ============================================================

    /**
     * @dev Perbarui array topAddresses dengan insertion sort sederhana.
     *      Cocok untuk array kecil (10 elemen).
     */
    function _updateTopAddresses(address candidate) internal {
        uint256 candidateScore = addressTxCount[candidate];
        for (uint256 i = 0; i < 10; i++) {
            if (topAddresses[i] == candidate) return;
            if (topAddresses[i] == address(0) || addressTxCount[topAddresses[i]] < candidateScore) {
                for (uint256 j = 9; j > i; j--) {
                    topAddresses[j] = topAddresses[j - 1];
                }
                topAddresses[i] = candidate;
                return;
            }
        }
    }

    /// @notice Test helper — simulate _onEvent() secara langsung.
    function simulateEvent(bytes memory eventData) external {
        _onEvent(eventData);
    }
}
