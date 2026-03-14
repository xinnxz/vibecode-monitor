// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// ============================================================
// WhaleDetector.sol — SomniaScan
//
// Contract ini menggunakan SOMNIA REACTIVITY untuk secara
// otomatis mendeteksi "whale movements" (perpindahan token dalam
// jumlah besar) di jaringan Somnia.
//
// Cara kerja:
// 1. Contract ini subscribe ke event Transfer dari token tertentu.
// 2. Saat Transfer > threshold terjadi, Somnia validator
//    otomatis memanggil _onEvent() tanpa perlu tx tambahan.
// 3. _onEvent() emit WhaleAlert → frontend bereaksi dengan
//    animasi Red Wave Pulse + Spatial Audio Siren.
//
// _onEvent signature (sesuai SomniaEventHandler v0.1.6):
//   _onEvent(address emitter, bytes32[] calldata eventTopics, bytes calldata data)
//
// eventTopics[0] = event signature hash (keccak256("Transfer(address,address,uint256)"))
// eventTopics[1] = from address (indexed)
// eventTopics[2] = to address (indexed)
// data           = ABI encoded non-indexed params (amount)
// ============================================================

import "@somnia-chain/reactivity-contracts/contracts/SomniaEventHandler.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract WhaleDetector is SomniaEventHandler, Ownable {
    // ============================================================
    // STATE VARIABLES
    // ============================================================

    /// @notice Batas minimum jumlah token untuk dianggap "Whale".
    ///         Default: 100,000 STT (dalam wei = 18 decimal).
    uint256 public whaleThreshold = 100_000 ether;

    /// @notice Jumlah total WhaleAlert yang sudah pernah emit.
    uint256 public totalWhaleAlerts;

    // ============================================================
    // EVENTS
    // ============================================================

    /// @notice Dipanggil saat transaksi whale terdeteksi.
    event WhaleAlert(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 alertId,
        uint256 timestamp
    );

    /// @notice Dipanggil saat owner mengubah threshold.
    event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);

    // ============================================================
    // CONSTRUCTOR
    // ============================================================

    constructor() Ownable(msg.sender) {}

    // ============================================================
    // SOMNIA REACTIVITY CORE
    // ============================================================

    /**
     * @notice Fungsi utama Reactivity. Dipanggil OTOMATIS oleh
     *         Somnia node saat event yang sudah di-subscribe terjadi.
     *
     * @param emitter       Kontrak yang emit event (Token contract address)
     * @param eventTopics   [0] = event sig hash, [1] = from (indexed), [2] = to (indexed)
     * @param data          ABI-encoded non-indexed params: uint256 amount
     */
    function _onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) internal override {
        // Suppress unused variable warning
        emitter;

        // Decode "from" dan "to" dari eventTopics (indexed params)
        // eventTopics[0] = keccak256("Transfer(address,address,uint256)")
        // eventTopics[1] = address from (padded to 32 bytes)
        // eventTopics[2] = address to (padded to 32 bytes)
        address from = address(uint160(uint256(eventTopics[1])));
        address to   = address(uint160(uint256(eventTopics[2])));

        // Decode "amount" dari data (non-indexed)
        uint256 amount = abi.decode(data, (uint256));

        // Cek apakah transaksi ini melampaui batas whale
        if (amount >= whaleThreshold) {
            totalWhaleAlerts++;
            emit WhaleAlert(from, to, amount, totalWhaleAlerts, block.timestamp);
        }
    }

    // ============================================================
    // ADMIN FUNCTIONS
    // ============================================================

    /**
     * @notice Ubah batas minimum untuk dianggap transaksi Whale.
     * @param newThreshold Threshold baru dalam wei.
     */
    function setWhaleThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold > 0, "Threshold harus lebih dari 0");
        uint256 old = whaleThreshold;
        whaleThreshold = newThreshold;
        emit ThresholdUpdated(old, newThreshold);
    }

    // ============================================================
    // VIEW FUNCTIONS
    // ============================================================

    /// @notice Kembalikan threshold saat ini dalam format STT (bukan wei).
    function getThresholdInSTT() external view returns (uint256) {
        return whaleThreshold / 1 ether;
    }
}
