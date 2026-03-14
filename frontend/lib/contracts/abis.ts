// lib/contracts/abis.ts
// ============================================================
// ABI (Application Binary Interface) untuk semua SomniaScan contracts.
//
// ABI adalah "daftar menu" yang memberitahu frontend cara berkomunikasi
// dengan smart contract — fungsi apa yang ada, parameternya apa,
// dan event apa yang bisa di-listen.
//
// Note: Ini adalah ABI minimal yang mencakup fungsi dan event yang
// dipakai oleh frontend. Hardhat artifacts berisi ABI lengkapnya.
// ============================================================

// ---- WhaleDetector ABI ----
export const WHALE_DETECTOR_ABI = [
  // State variables (otomatis jadi getter function)
  "function whaleThreshold() external view returns (uint256)",
  "function totalWhaleAlerts() external view returns (uint256)",
  "function getThresholdInSTT() external view returns (uint256)",

  // Admin functions
  "function setWhaleThreshold(uint256 newThreshold) external",

  // Events — yang di-listen oleh frontend untuk animasi globe
  "event WhaleAlert(address indexed from, address indexed to, uint256 amount, uint256 alertId, uint256 timestamp)",
  "event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold)",
] as const;

// ---- AlertEngine ABI ----
export const ALERT_ENGINE_ABI = [
  // State variables
  "function totalRulesCreated() external view returns (uint256)",
  "function totalAlertsEmitted() external view returns (uint256)",

  // User functions — membuat alert rules
  "function createAmountAlert(uint256 threshold, string calldata message) external returns (uint256 ruleId)",
  "function createFromAddressAlert(address watchedAddress, string calldata message) external returns (uint256 ruleId)",
  "function createToAddressAlert(address watchedAddress, string calldata message) external returns (uint256 ruleId)",
  "function deactivateRule(uint256 ruleId) external",

  // View functions
  "function getUserRuleIds(address user) external view returns (uint256[])",
  "function getRule(uint256 ruleId) external view returns (tuple(uint256 id, address owner, uint8 condition, uint256 amountThreshold, address targetAddress, string message, bool isActive, uint256 triggerCount, uint256 createdAt))",

  // Events
  "event AlertTriggered(uint256 indexed ruleId, address indexed ruleOwner, address from, address to, uint256 amount, string message, uint256 timestamp)",
  "event RuleCreated(uint256 indexed ruleId, address indexed owner, string message)",
  "event RuleDeactivated(uint256 indexed ruleId, address indexed owner)",
] as const;

// ---- EventAggregator ABI ----
export const EVENT_AGGREGATOR_ABI = [
  // Network stats — dibaca oleh HUD
  "function totalTransactions() external view returns (uint256)",
  "function totalVolumeWei() external view returns (uint256)",
  "function uniqueAddressCount() external view returns (uint256)",
  "function largestTransactionEver() external view returns (uint256)",
  "function largestTxSender() external view returns (address)",
  "function deployedAt() external view returns (uint256)",

  // View functions
  "function getTotalVolumeSTT() external view returns (uint256)",
  "function getTodayStats() external view returns (uint256 txCount, uint256 volume)",
  "function getRecentDailyStats(uint256 numDays) external view returns (uint256[] memory txCounts, uint256[] memory volumes)",
  "function getTopAddresses() external view returns (address[10] memory)",

  // Events
  "event StatsUpdated(uint256 totalTransactions, uint256 totalVolumeWei, uint256 uniqueAddressCount, uint256 timestamp)",
  "event NewLargestTransaction(address indexed sender, uint256 amount, uint256 timestamp)",
] as const;

// ---- ScopeRegistry ABI ----
export const SCOPE_REGISTRY_ABI = [
  // State variables
  "function totalProfiles() external view returns (uint256)",

  // Profile management
  "function createProfile(string calldata username, string calldata bio, string calldata avatarURI) external",
  "function updateProfile(string calldata username, string calldata bio, string calldata avatarURI) external",

  // Watchlist
  "function addToWatchlist(address watched) external",
  "function removeFromWatchlist(address watched) external",
  "function getWatchlist(address user) external view returns (address[])",
  "function isWatching(address user, address watched) external view returns (bool)",

  // View functions
  "function profiles(address user) external view returns (tuple(string username, string bio, string avatarURI, uint256 joinedAt, bool exists))",
  "function userStats(address user) external view returns (tuple(uint256 blocksWatched, uint256 alertsCreated, uint256 alertsTriggered, uint256 whaleAlertsWitnessed, uint256 sbtLevel))",
  "function getUserData(address user) external view returns (tuple(string username, string bio, string avatarURI, uint256 joinedAt, bool exists) profile, tuple(uint256 blocksWatched, uint256 alertsCreated, uint256 alertsTriggered, uint256 whaleAlertsWitnessed, uint256 sbtLevel) stats)",

  // Events
  "event ProfileCreated(address indexed user, string username, uint256 timestamp)",
  "event WatchlistAdded(address indexed user, address watchedAddress)",
  "event SBTMinted(address indexed user, uint256 tokenId, uint256 level, string badge)",
] as const;
