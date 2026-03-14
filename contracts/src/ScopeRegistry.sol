// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// ============================================================
// ScopeRegistry.sol — SomniaScan
//
// Registry terpusat untuk:
// 1. Profil pengguna SomniaScan (username, bio, avatar URI)
// 2. Watchlist dompet (user bisa "follow" alamat tertentu)
// 3. Soulbound Token (SBT) milestone — "Proof of Activity"
//
// SBT adalah ERC-721 yang TIDAK BISA dipindahtangankan.
// Ini adalah rekam jejak permanen keaktifan user di SomniaScan.
//
// Milestone SBT:
// - Level 1 "Observer"    : Lihat 100 blok pertama (75 tx)
// - Level 2 "Analyst"     : Buat 1 alert rule
// - Level 3 "Sentinel"    : Alert rule pertama trigger
// - Level 4 "Whalewatcher": Saksikan 10 whale alerts
// - Level 5 "SomniaScan OG": Semua level di atas selesai
// ============================================================

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ScopeRegistry is ERC721, Ownable {
    // ============================================================
    // TYPES
    // ============================================================

    struct UserProfile {
        string username;
        string bio;
        string avatarURI;    // IPFS URI untuk avatar NFT (opsional)
        uint256 joinedAt;
        bool exists;
    }

    struct UserStats {
        uint256 blocksWatched;      // Berapa blok yang sudah user pantau
        uint256 alertsCreated;      // Berapa alert rule yang dibuat
        uint256 alertsTriggered;    // Berapa alert yang sudah pernah trigger
        uint256 whaleAlertsWitnessed; // Berapa kali online saat whale alert
        uint256 sbtLevel;           // Level SBT saat ini (0-5)
    }

    // ============================================================
    // STATE VARIABLES
    // ============================================================

    /// @notice Profil user. address → UserProfile
    mapping(address => UserProfile) public profiles;

    /// @notice Statistik aktivitas user. address → UserStats
    mapping(address => UserStats) public userStats;

    /// @notice Watchlist: user → list alamat yang di-watch
    mapping(address => address[]) private _watchlists;

    /// @notice Apakah user sudah watch alamat tertentu?
    mapping(address => mapping(address => bool)) public isWatching;

    /// @notice Total profil yang terdaftar
    uint256 public totalProfiles;

    /// @notice Counter token ID untuk SBT
    uint256 private _nextTokenId = 1;

    /// @notice Contract resmi yang diizinkan update stats (WhaleDetector, AlertEngine, dll)
    mapping(address => bool) public authorizedUpdaters;

    // ============================================================
    // EVENTS
    // ============================================================

    event ProfileCreated(address indexed user, string username, uint256 timestamp);
    event ProfileUpdated(address indexed user, string newUsername);
    event WatchlistAdded(address indexed user, address watchedAddress);
    event WatchlistRemoved(address indexed user, address watchedAddress);
    event SBTMinted(address indexed user, uint256 tokenId, uint256 level, string badge);
    event StatsUpdated(address indexed user, uint256 newSbtLevel);

    // ============================================================
    // CONSTRUCTOR
    // ============================================================

    constructor() ERC721("SomniaScan Badge", "SCSCAN") Ownable(msg.sender) {}

    // ============================================================
    // PROFILE MANAGEMENT
    // ============================================================

    /**
     * @notice Daftarkan profil baru di SomniaScan.
     * @param username  Nama tampilan (bisa sama dengan orang lain, bukan unique key).
     * @param bio       Deskripsi singkat.
     * @param avatarURI IPFS URI untuk avatar (boleh kosong).
     */
    function createProfile(
        string calldata username,
        string calldata bio,
        string calldata avatarURI
    ) external {
        require(!profiles[msg.sender].exists, "Profil sudah ada");
        require(bytes(username).length > 0, "Username tidak boleh kosong");
        require(bytes(username).length <= 32, "Username maks 32 karakter");

        profiles[msg.sender] = UserProfile({
            username: username,
            bio: bio,
            avatarURI: avatarURI,
            joinedAt: block.timestamp,
            exists: true
        });

        totalProfiles++;
        emit ProfileCreated(msg.sender, username, block.timestamp);

        // Auto-cek milestone saat join
        _checkAndMintSBT(msg.sender);
    }

    /**
     * @notice Perbarui profil yang sudah ada.
     */
    function updateProfile(
        string calldata username,
        string calldata bio,
        string calldata avatarURI
    ) external {
        require(profiles[msg.sender].exists, "Profil belum ada, gunakan createProfile");
        if (bytes(username).length > 0) {
            profiles[msg.sender].username = username;
        }
        profiles[msg.sender].bio = bio;
        profiles[msg.sender].avatarURI = avatarURI;
        emit ProfileUpdated(msg.sender, username);
    }

    // ============================================================
    // WATCHLIST MANAGEMENT
    // ============================================================

    /**
     * @notice Tambahkan alamat ke watchlist user.
     * @param watched Alamat yang ingin dipantau.
     */
    function addToWatchlist(address watched) external {
        require(!isWatching[msg.sender][watched], "Sudah di-watch");
        require(watched != msg.sender, "Tidak bisa watch diri sendiri");
        _watchlists[msg.sender].push(watched);
        isWatching[msg.sender][watched] = true;
        emit WatchlistAdded(msg.sender, watched);
    }

    /**
     * @notice Hapus alamat dari watchlist user.
     * @param watched Alamat yang ingin dihapus dari watchlist.
     */
    function removeFromWatchlist(address watched) external {
        require(isWatching[msg.sender][watched], "Tidak ada di watchlist");
        isWatching[msg.sender][watched] = false;

        address[] storage wl = _watchlists[msg.sender];
        for (uint256 i = 0; i < wl.length; i++) {
            if (wl[i] == watched) {
                wl[i] = wl[wl.length - 1];
                wl.pop();
                break;
            }
        }
        emit WatchlistRemoved(msg.sender, watched);
    }

    // ============================================================
    // STATS UPDATERS (dipanggil oleh contract lain yang authorized)
    // ============================================================

    /// @notice Tambahkan authorized updater (misal: AlertEngine, WhaleDetector).
    function addAuthorizedUpdater(address updater) external onlyOwner {
        authorizedUpdaters[updater] = true;
    }

    /// @notice Update statistik user setelah aktivitas on-chain.
    function recordBlockWatched(address user, uint256 count) external {
        require(authorizedUpdaters[msg.sender] || msg.sender == owner(), "Tidak authorized");
        userStats[user].blocksWatched += count;
        _checkAndMintSBT(user);
    }

    function recordAlertCreated(address user) external {
        require(authorizedUpdaters[msg.sender] || msg.sender == owner(), "Tidak authorized");
        userStats[user].alertsCreated++;
        _checkAndMintSBT(user);
    }

    function recordAlertTriggered(address user) external {
        require(authorizedUpdaters[msg.sender] || msg.sender == owner(), "Tidak authorized");
        userStats[user].alertsTriggered++;
        _checkAndMintSBT(user);
    }

    function recordWhaleWitnessed(address user) external {
        require(authorizedUpdaters[msg.sender] || msg.sender == owner(), "Tidak authorized");
        userStats[user].whaleAlertsWitnessed++;
        _checkAndMintSBT(user);
    }

    // ============================================================
    // SBT LOGIC
    // ============================================================

    /**
     * @dev Cek milestone dan mint SBT jika level baru tercapai.
     */
    function _checkAndMintSBT(address user) internal {
        UserStats storage stats = userStats[user];
        uint256 currentLevel = stats.sbtLevel;
        uint256 newLevel = currentLevel;

        if (newLevel < 1 && stats.blocksWatched >= 75) newLevel = 1;
        if (newLevel < 2 && stats.alertsCreated >= 1) newLevel = 2;
        if (newLevel < 3 && stats.alertsTriggered >= 1) newLevel = 3;
        if (newLevel < 4 && stats.whaleAlertsWitnessed >= 10) newLevel = 4;
        if (newLevel < 5 && stats.sbtLevel >= 4 &&
            stats.blocksWatched >= 75 &&
            stats.alertsCreated >= 1 &&
            stats.alertsTriggered >= 1 &&
            stats.whaleAlertsWitnessed >= 10) newLevel = 5;

        if (newLevel > currentLevel) {
            stats.sbtLevel = newLevel;
            _mintSBT(user, newLevel);
            emit StatsUpdated(user, newLevel);
        }
    }

    function _mintSBT(address to, uint256 level) internal {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        string memory badge;
        if (level == 1) badge = "Observer";
        else if (level == 2) badge = "Analyst";
        else if (level == 3) badge = "Sentinel";
        else if (level == 4) badge = "Whalewatcher";
        else if (level == 5) badge = "SomniaScan OG";

        emit SBTMinted(to, tokenId, level, badge);
    }

    /**
     * @dev Override transfer: SBT tidak bisa dipindahtangankan.
     *      Setiap percobaan transfer selain mint akan di-revert.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        // Izinkan hanya mint (from == address(0)) dan burn (to == address(0))
        if (from != address(0) && to != address(0)) {
            revert("SomniaScan SBT: Tidak bisa dipindahtangankan");
        }
        return super._update(to, tokenId, auth);
    }

    // ============================================================
    // VIEW FUNCTIONS
    // ============================================================

    /// @notice Ambil watchlist lengkap milik user.
    function getWatchlist(address user) external view returns (address[] memory) {
        return _watchlists[user];
    }

    /// @notice Ambil profil + stats user dalam satu call.
    function getUserData(address user)
        external
        view
        returns (UserProfile memory profile, UserStats memory stats)
    {
        profile = profiles[user];
        stats = userStats[user];
    }
}
