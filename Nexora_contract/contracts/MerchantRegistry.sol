// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract MerchantRegistry is Initializable, AccessControl, Pausable, UUPSUpgradeable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MERCHANT_MANAGER_ROLE = keccak256("MERCHANT_MANAGER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant REFUND_MANAGER_ROLE = keccak256("REFUND_MANAGER_ROLE");
    bytes32 public constant TIMELOCK_ROLE = keccak256("TIMELOCK_ROLE");
    uint16 public constant MAX_FEE_BPS = 1_000;

    struct Merchant {
        address wallet;
        uint16 feeBps;
        uint8 settlementPreference;
        bool kycApproved;
        bool active;
    }

    mapping(address merchant => Merchant data) public merchants;

    event MerchantUpdated(address indexed merchant, address indexed wallet, uint16 feeBps, bool kycApproved, bool active, uint8 settlementPreference);

    error ZeroAddress();
    error InvalidFee();
    error MerchantInactive();
    error KycRequired();
    error TimelockRequired();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin, address timelock) external initializer {
        if (admin == address(0) || timelock == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(MERCHANT_MANAGER_ROLE, admin);
        _grantRole(MERCHANT_MANAGER_ROLE, timelock);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(REFUND_MANAGER_ROLE, admin);
        _grantRole(TIMELOCK_ROLE, timelock);
    }

    function setMerchant(
        address merchant,
        address wallet,
        uint16 feeBps,
        bool kycApproved,
        bool active,
        uint8 settlementPreference
    ) external onlyRole(MERCHANT_MANAGER_ROLE) {
        if (merchant == address(0) || wallet == address(0)) revert ZeroAddress();
        if (feeBps > MAX_FEE_BPS) revert InvalidFee();
        Merchant memory current = merchants[merchant];
        if (current.wallet != address(0) && current.feeBps != feeBps && !hasRole(TIMELOCK_ROLE, msg.sender)) {
            revert TimelockRequired();
        }

        merchants[merchant] = Merchant({
            wallet: wallet,
            feeBps: feeBps,
            settlementPreference: settlementPreference,
            kycApproved: kycApproved,
            active: active
        });
        emit MerchantUpdated(merchant, wallet, feeBps, kycApproved, active, settlementPreference);
    }

    function setMerchantFee(address merchant, uint16 feeBps) external onlyRole(TIMELOCK_ROLE) {
        if (feeBps > MAX_FEE_BPS) revert InvalidFee();
        Merchant storage data = merchants[merchant];
        if (data.wallet == address(0)) revert ZeroAddress();
        data.feeBps = feeBps;
        emit MerchantUpdated(merchant, data.wallet, feeBps, data.kycApproved, data.active, data.settlementPreference);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function settlementFor(address merchant) external view returns (address wallet, uint16 feeBps) {
        Merchant memory data = merchants[merchant];
        if (!data.kycApproved) revert KycRequired();
        if (!data.active) revert MerchantInactive();
        return (data.wallet, data.feeBps);
    }

    function _authorizeUpgrade(address) internal override onlyRole(TIMELOCK_ROLE) {}
}
