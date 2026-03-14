// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// ============================================================
// AlertEngine.sol — SomniaScan
//
// Engine untuk membuat, mengelola, dan mengeksekusi custom alert
// rules secara on-chain. User bisa menetapkan kondisi:
//   "Jika Transfer dari [address Y] dengan [amount > Z] → Alert"
//
// Menggunakan SomniaEventHandler v0.1.6:
//   _onEvent(address emitter, bytes32[] calldata eventTopics, bytes calldata data)
//   - eventTopics[0] = event signature hash
//   - eventTopics[1] = from address (indexed, padded 32 bytes)
//   - eventTopics[2] = to address (indexed, padded 32 bytes)
//   - data           = abi.encode(uint256 amount)
// ============================================================

import "@somnia-chain/reactivity-contracts/contracts/SomniaEventHandler.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AlertEngine is SomniaEventHandler, Ownable {
    // ============================================================
    // TYPES
    // ============================================================

    enum ConditionType {
        AMOUNT_GREATER_THAN,    // amount > threshold
        AMOUNT_LESS_THAN,       // amount < threshold
        FROM_ADDRESS,           // from == targetAddress
        TO_ADDRESS,             // to == targetAddress
        ANY_TRANSFER            // setiap transfer
    }

    struct AlertRule {
        uint256 id;
        address owner;
        ConditionType condition;
        uint256 amountThreshold;
        address targetAddress;
        string message;
        bool isActive;
        uint256 triggerCount;
        uint256 createdAt;
    }

    // ============================================================
    // STATE VARIABLES
    // ============================================================

    uint256 private _nextRuleId = 1;
    mapping(uint256 => AlertRule) public rules;
    mapping(address => uint256[]) public userRules;
    uint256 public totalRulesCreated;
    uint256 public totalAlertsEmitted;

    // ============================================================
    // EVENTS
    // ============================================================

    event AlertTriggered(
        uint256 indexed ruleId,
        address indexed ruleOwner,
        address from,
        address to,
        uint256 amount,
        string message,
        uint256 timestamp
    );

    event RuleCreated(uint256 indexed ruleId, address indexed owner, string message);
    event RuleDeactivated(uint256 indexed ruleId, address indexed owner);

    // ============================================================
    // CONSTRUCTOR
    // ============================================================

    constructor() Ownable(msg.sender) {}

    // ============================================================
    // USER FUNCTIONS
    // ============================================================

    function createAmountAlert(
        uint256 threshold,
        string calldata message
    ) external returns (uint256 ruleId) {
        ruleId = _createRule(msg.sender, ConditionType.AMOUNT_GREATER_THAN, threshold, address(0), message);
    }

    function createFromAddressAlert(
        address watchedAddress,
        string calldata message
    ) external returns (uint256 ruleId) {
        ruleId = _createRule(msg.sender, ConditionType.FROM_ADDRESS, 0, watchedAddress, message);
    }

    function createToAddressAlert(
        address watchedAddress,
        string calldata message
    ) external returns (uint256 ruleId) {
        ruleId = _createRule(msg.sender, ConditionType.TO_ADDRESS, 0, watchedAddress, message);
    }

    function deactivateRule(uint256 ruleId) external {
        AlertRule storage rule = rules[ruleId];
        require(rule.owner == msg.sender, "Bukan pemilik rule ini");
        require(rule.isActive, "Rule sudah tidak aktif");
        rule.isActive = false;
        emit RuleDeactivated(ruleId, msg.sender);
    }

    // ============================================================
    // SOMNIA REACTIVITY CORE
    // ============================================================

    /**
     * @notice Auto-dipanggil oleh Somnia saat event Transfer terdeteksi.
     * @param emitter       Contract yang emit event (token address). Unused tapi wajib ada.
     * @param eventTopics   EVM event topics (sig, from, to)
     * @param data          ABI-encoded uint256 amount
     */
    function _onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) internal override {
        emitter; // suppress unused warning

        address from = address(uint160(uint256(eventTopics[1])));
        address to   = address(uint160(uint256(eventTopics[2])));
        uint256 amount = abi.decode(data, (uint256));

        for (uint256 i = 1; i < _nextRuleId; i++) {
            AlertRule storage rule = rules[i];
            if (!rule.isActive) continue;

            bool triggered = false;

            if (rule.condition == ConditionType.AMOUNT_GREATER_THAN) {
                triggered = amount > rule.amountThreshold;
            } else if (rule.condition == ConditionType.AMOUNT_LESS_THAN) {
                triggered = amount < rule.amountThreshold;
            } else if (rule.condition == ConditionType.FROM_ADDRESS) {
                triggered = from == rule.targetAddress;
            } else if (rule.condition == ConditionType.TO_ADDRESS) {
                triggered = to == rule.targetAddress;
            } else if (rule.condition == ConditionType.ANY_TRANSFER) {
                triggered = true;
            }

            if (triggered) {
                rule.triggerCount++;
                totalAlertsEmitted++;
                emit AlertTriggered(rule.id, rule.owner, from, to, amount, rule.message, block.timestamp);
            }
        }
    }

    // ============================================================
    // VIEW FUNCTIONS
    // ============================================================

    function getUserRuleIds(address user) external view returns (uint256[] memory) {
        return userRules[user];
    }

    function getRule(uint256 ruleId) external view returns (AlertRule memory) {
        return rules[ruleId];
    }

    // ============================================================
    // INTERNAL HELPERS
    // ============================================================

    function _createRule(
        address owner,
        ConditionType condition,
        uint256 amountThreshold,
        address targetAddress,
        string memory message
    ) internal returns (uint256 ruleId) {
        ruleId = _nextRuleId++;
        rules[ruleId] = AlertRule({
            id: ruleId,
            owner: owner,
            condition: condition,
            amountThreshold: amountThreshold,
            targetAddress: targetAddress,
            message: message,
            isActive: true,
            triggerCount: 0,
            createdAt: block.timestamp
        });
        userRules[owner].push(ruleId);
        totalRulesCreated++;
        emit RuleCreated(ruleId, owner, message);
    }
}
