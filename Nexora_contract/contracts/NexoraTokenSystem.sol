// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract NexoraTokenSystem is
    Initializable,
    AccessControl,
    ERC20,
    ERC20Burnable,
    ERC20Capped,
    ERC20Pausable,
    ERC20Permit,
    ERC20Votes,
    ReentrancyGuard,
    UUPSUpgradeable
{
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant VESTING_MANAGER_ROLE = keccak256("VESTING_MANAGER_ROLE");
    bytes32 public constant TIMELOCK_ROLE = keccak256("TIMELOCK_ROLE");

    uint256 public constant MAX_SUPPLY = 1_000_000_000 ether;
    uint128 public constant TEAM_CAP = 250_000_000 ether;
    uint128 public constant INVESTORS_CAP = 200_000_000 ether;
    uint128 public constant ADVISORS_CAP = 100_000_000 ether;
    uint128 public constant ECOSYSTEM_CAP = 300_000_000 ether;
    uint128 public constant TREASURY_CAP = 150_000_000 ether;

    enum VestingCategory {
        Team,
        Investors,
        Advisors,
        Ecosystem,
        Treasury
    }

    struct VestingSchedule {
        address beneficiary;
        uint128 totalAmount;
        uint128 released;
        uint64 start;
        uint64 cliff;
        uint64 duration;
        bool revocable;
        bool revoked;
    }

    mapping(bytes32 => VestingSchedule) public schedules;
    mapping(uint8 => uint128) public categoryReserved;

    event VestingCreated(bytes32 indexed scheduleId, address indexed beneficiary, uint256 amount, VestingCategory category);
    event TokensReleased(bytes32 indexed scheduleId, uint256 amount);
    event VestingRevoked(bytes32 indexed scheduleId, uint256 refunded);

    error ZeroAddress();
    error ZeroAmount();
    error ScheduleExists();
    error InvalidSchedule();
    error NothingToRelease();
    error NotRevocable();
    error Unauthorized();
    error InsufficientFunds();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor()
        ERC20("Nexora", "NXR")
        ERC20Capped(MAX_SUPPLY)
        ERC20Permit("Nexora")
    {
        _disableInitializers();
    }

    function initialize(address admin, address timelock) external initializer {
        if (admin == address(0) || timelock == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(VESTING_MANAGER_ROLE, admin);
        _grantRole(MINTER_ROLE, timelock);
        _grantRole(TIMELOCK_ROLE, timelock);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        _mint(to, amount);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function createVestingSchedule(
        bytes32 scheduleId,
        address beneficiary,
        uint128 amount,
        uint64 start,
        uint64 cliffDuration,
        VestingCategory category,
        bool revocable
    ) external onlyRole(VESTING_MANAGER_ROLE) {
        if (beneficiary == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (schedules[scheduleId].beneficiary != address(0)) revert ScheduleExists();
        if (balanceOf(address(this)) < amount) revert InsufficientFunds();

        uint64 duration = _categoryDuration(category);
        if (cliffDuration > duration) revert InvalidSchedule();

        uint8 categoryIndex = uint8(category);
        uint128 cap = _categoryCap(categoryIndex);
        uint128 reserved = categoryReserved[categoryIndex] + amount;
        if (reserved > cap) revert InvalidSchedule();
        categoryReserved[categoryIndex] = reserved;

        schedules[scheduleId] = VestingSchedule({
            beneficiary: beneficiary,
            totalAmount: amount,
            released: 0,
            start: start,
            cliff: start + cliffDuration,
            duration: duration,
            revocable: revocable,
            revoked: false
        });

        emit VestingCreated(scheduleId, beneficiary, amount, category);
    }

    function release(bytes32 scheduleId) external nonReentrant whenNotPaused {
        VestingSchedule storage schedule = schedules[scheduleId];
        uint256 amount = releasable(scheduleId);
        if (amount == 0) revert NothingToRelease();

        schedule.released += uint128(amount);
        _transfer(address(this), schedule.beneficiary, amount);
        emit TokensReleased(scheduleId, amount);
    }

    function revokeVesting(bytes32 scheduleId, address recipient) external onlyRole(VESTING_MANAGER_ROLE) nonReentrant {
        if (recipient == address(0)) revert ZeroAddress();

        VestingSchedule storage schedule = schedules[scheduleId];
        if (!schedule.revocable || schedule.revoked) revert NotRevocable();

        uint256 vested = vestedAmount(scheduleId, uint64(block.timestamp));
        uint256 unreleased = schedule.totalAmount - vested;
        schedule.revoked = true;
        schedule.totalAmount = uint128(vested);

        if (unreleased != 0) {
            _transfer(address(this), recipient, unreleased);
        }
        emit VestingRevoked(scheduleId, unreleased);
    }

    function pauseVesting() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function resumeVesting() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function releasable(bytes32 scheduleId) public view returns (uint256) {
        VestingSchedule memory schedule = schedules[scheduleId];
        if (schedule.beneficiary == address(0) || schedule.revoked) return 0;
        return vestedAmount(scheduleId, uint64(block.timestamp)) - schedule.released;
    }

    function vestedAmount(bytes32 scheduleId, uint64 timestamp) public view returns (uint256) {
        VestingSchedule memory schedule = schedules[scheduleId];
        if (schedule.beneficiary == address(0) || timestamp < schedule.cliff) return 0;
        if (timestamp >= schedule.start + schedule.duration) {
            return schedule.totalAmount;
        }
        return (uint256(schedule.totalAmount) * (timestamp - schedule.start)) / schedule.duration;
    }

    function _categoryDuration(VestingCategory category) private pure returns (uint64) {
        if (category == VestingCategory.Team) return 48 * 30 days;
        if (category == VestingCategory.Investors) return 24 * 30 days;
        if (category == VestingCategory.Advisors) return 18 * 30 days;
        if (category == VestingCategory.Ecosystem) return 12 * 30 days;
        return 6 * 30 days;
    }

    function _categoryCap(uint8 categoryIndex) private pure returns (uint128) {
        if (categoryIndex == uint8(VestingCategory.Team)) return TEAM_CAP;
        if (categoryIndex == uint8(VestingCategory.Investors)) return INVESTORS_CAP;
        if (categoryIndex == uint8(VestingCategory.Advisors)) return ADVISORS_CAP;
        if (categoryIndex == uint8(VestingCategory.Ecosystem)) return ECOSYSTEM_CAP;
        return TREASURY_CAP;
    }

    function _authorizeUpgrade(address) internal override onlyRole(TIMELOCK_ROLE) {}

    function _update(address from, address to, uint256 amount)
        internal
        override(ERC20, ERC20Capped, ERC20Pausable, ERC20Votes)
    {
        super._update(from, to, amount);
    }

    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
