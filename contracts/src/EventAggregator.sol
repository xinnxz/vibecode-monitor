// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

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
// - Ranking/leaderboard alamat tersibuk (top 10)
//
// Semua data ini digunakan oleh frontend SomniaScan untuk
// menampilkan HUD dan grafik realtime.
// ============================================================

import "@somnia-chain/reactivity-contracts/contracts/SomniaEventHandler.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EventAggregator is SomniaEventHandler, Ownable {
    // ============================================================
    // STATE VARIABLES
    // ============================================================

    uint256 public totalTransactions;
    uint256 public totalVolumeWei;
    uint256 public uniqueAddressCount;
    uint256 public largestTransactionEver;
    address public largestTxSender;
    uint256 public immutable deployedAt;

    mapping(uint256 => uint256) public dailyTxCount;
    mapping(uint256 => uint256) public dailyVolume;
    mapping(address => uint256) public addressTxCount;
    mapping(address => uint256) public addressVolume;
    mapping(address => bool) public isKnownAddress;
    address[10] public topAddresses;

    // ============================================================
    // EVENTS
    // ============================================================

    event StatsUpdated(
        uint256 totalTransactions,
        uint256 totalVolumeWei,
        uint256 uniqueAddressCount,
        uint256 timestamp
    );

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
     * @param emitter       Token contract yang emit Transfer. Unused.
     * @param eventTopics   [1] = from (indexed), [2] = to (indexed)
     * @param data          ABI-encoded uint256 amount
     */
    function _onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) internal override {
        emitter; // suppress unused warning

        address from = address(uint160(uint256(eventTopics[1])));
        uint256 amount = abi.decode(data, (uint256));

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

        emit StatsUpdated(totalTransactions, totalVolumeWei, uniqueAddressCount, block.timestamp);
    }

    // ============================================================
    // VIEW FUNCTIONS
    // ============================================================

    function getTotalVolumeSTT() external view returns (uint256) {
        return totalVolumeWei / 1 ether;
    }

    function getTodayStats() external view returns (uint256 txCount, uint256 volume) {
        uint256 today = block.timestamp / 86400;
        txCount = dailyTxCount[today];
        volume = dailyVolume[today];
    }

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

    function getTopAddresses() external view returns (address[10] memory) {
        return topAddresses;
    }

    // ============================================================
    // INTERNAL HELPERS
    // ============================================================

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
}
