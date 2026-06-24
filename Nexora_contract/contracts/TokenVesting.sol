// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TokenVesting is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant VESTING_MANAGER_ROLE = keccak256("VESTING_MANAGER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    enum ScheduleType {
        Team,
        Investors,
        Advisors,
        Partners
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

    IERC20 public immutable token;
    mapping(bytes32 scheduleId => VestingSchedule schedule) public schedules;

    event VestingCreated(bytes32 indexed scheduleId, address indexed beneficiary, uint256 amount);
    event TokensReleased(bytes32 indexed scheduleId, uint256 amount);
    event VestingRevoked(bytes32 indexed scheduleId);

    error ZeroAddress();
    error InvalidSchedule();
    error ScheduleExists();
    error NothingToRelease();
    error NotRevocable();

    constructor(IERC20 vestingToken, address admin) {
        if (address(vestingToken) == address(0) || admin == address(0)) revert ZeroAddress();
        token = vestingToken;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(VESTING_MANAGER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    function createVestingSchedule(
        bytes32 scheduleId,
        address beneficiary,
        uint128 amount,
        uint64 start,
        uint64 cliffDuration,
        ScheduleType scheduleType,
        bool revocable
    ) external onlyRole(VESTING_MANAGER_ROLE) {
        if (beneficiary == address(0)) revert ZeroAddress();
        if (amount == 0 || schedules[scheduleId].beneficiary != address(0)) {
            if (amount == 0) revert InvalidSchedule();
            revert ScheduleExists();
        }

        uint64 duration = _durationFor(scheduleType);
        if (cliffDuration > duration) revert InvalidSchedule();

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
        emit VestingCreated(scheduleId, beneficiary, amount);
    }

    function release(bytes32 scheduleId) external nonReentrant whenNotPaused {
        VestingSchedule storage schedule = schedules[scheduleId];
        uint256 amount = releasable(scheduleId);
        if (amount == 0) revert NothingToRelease();

        schedule.released += uint128(amount);
        token.safeTransfer(schedule.beneficiary, amount);
        emit TokensReleased(scheduleId, amount);
    }

    function revokeSchedule(bytes32 scheduleId, address recipient) external onlyRole(VESTING_MANAGER_ROLE) nonReentrant {
        if (recipient == address(0)) revert ZeroAddress();
        VestingSchedule storage schedule = schedules[scheduleId];
        if (!schedule.revocable || schedule.revoked) revert NotRevocable();

        uint256 vested = vestedAmount(scheduleId, uint64(block.timestamp));
        uint256 unreleased = schedule.totalAmount - vested;
        schedule.revoked = true;
        schedule.totalAmount = uint128(vested);
        if (unreleased != 0) token.safeTransfer(recipient, unreleased);
        emit VestingRevoked(scheduleId);
    }

    function pauseVesting() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function resumeVesting() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function releasable(bytes32 scheduleId) public view returns (uint256) {
        VestingSchedule memory schedule = schedules[scheduleId];
        if (schedule.revoked) return 0;
        return vestedAmount(scheduleId, uint64(block.timestamp)) - schedule.released;
    }

    function vestedAmount(bytes32 scheduleId, uint64 timestamp) public view returns (uint256) {
        VestingSchedule memory schedule = schedules[scheduleId];
        if (schedule.beneficiary == address(0) || timestamp < schedule.cliff) return 0;

        uint256 elapsed = timestamp - schedule.start;
        if (elapsed >= schedule.duration) return schedule.totalAmount;
        return (uint256(schedule.totalAmount) * elapsed) / schedule.duration;
    }

    function _durationFor(ScheduleType scheduleType) private pure returns (uint64) {
        if (scheduleType == ScheduleType.Team) return 48 * 30 days;
        if (scheduleType == ScheduleType.Investors) return 24 * 30 days;
        if (scheduleType == ScheduleType.Advisors) return 18 * 30 days;
        return 12 * 30 days;
    }
}
