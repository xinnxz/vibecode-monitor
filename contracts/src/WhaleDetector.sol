// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

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
// TIDAK PERLU:
// - Backend server/bot untuk polling
// - Keeper bot untuk monitoring
// - Off-chain cron job
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
    /// @param from     Alamat pengirim
    /// @param to       Alamat penerima
    /// @param amount   Jumlah token yang dikirim (dalam wei)
    /// @param alertId  ID urutan alert (untuk indexing di frontend)
    /// @param timestamp Waktu deteksi (block.timestamp)
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
     * @dev eventData berisi ABI-encoded: (address from, address to, uint256 amount)
     *      yang berasal dari event Transfer ERC-20 yang kita observe.
     *
     * @param eventData Raw ABI-encoded event data dari Somnia validator.
     */
    function _onEvent(bytes memory eventData) internal override {
        // Decode data transfer yang diterima dari Reactivity
        (address from, address to, uint256 amount) = abi.decode(
            eventData,
            (address, address, uint256)
        );

        // Cek apakah transaksi ini melampaui batas whale
        if (amount >= whaleThreshold) {
            totalWhaleAlerts++;

            emit WhaleAlert(
                from,
                to,
                amount,
                totalWhaleAlerts,
                block.timestamp
            );
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

    // ============================================================
    // TEST HELPER (dapat dihapus sebelum mainnet deploy)
    // ============================================================

    /// @notice Simulate _onEvent() untuk keperluan unit testing lokal.
    ///         Di jaringan Somnia, ini dipanggil otomatis oleh Reactivity.
    function simulateEvent(bytes memory eventData) external {
        _onEvent(eventData);
    }
}
