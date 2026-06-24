// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TokenTreasury is Initializable, AccessControl, ReentrancyGuard, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    bytes32 public constant TIMELOCK_ROLE = keccak256("TIMELOCK_ROLE");
    bytes32 public constant REWARD_MANAGER_ROLE = keccak256("REWARD_MANAGER_ROLE");
    uint256 public constant MIN_TIMELOCK_DELAY = 48 hours;

    TimelockController public timelock;

    event Distributed(address indexed token, address indexed recipient, uint256 amount);

    error ZeroAddress();
    error ZeroAmount();
    error TransferFailed();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(TimelockController controller, address rewardManager, address admin) external initializer {
        if (address(controller) == address(0) || rewardManager == address(0) || admin == address(0)) revert ZeroAddress();
        if (controller.getMinDelay() < MIN_TIMELOCK_DELAY) revert ZeroAmount();
        timelock = controller;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(TIMELOCK_ROLE, address(controller));
        _grantRole(REWARD_MANAGER_ROLE, rewardManager);
    }

    receive() external payable {}

    function distributeReward(IERC20 token, address recipient, uint256 amount) external onlyRole(REWARD_MANAGER_ROLE) nonReentrant {
        _distributeToken(token, recipient, amount);
    }

    function withdrawToken(IERC20 token, address recipient, uint256 amount) external onlyRole(TIMELOCK_ROLE) nonReentrant {
        _distributeToken(token, recipient, amount);
    }

    function withdrawETH(address payable recipient, uint256 amount) external onlyRole(TIMELOCK_ROLE) nonReentrant {
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        (bool success,) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed();
        emit Distributed(address(0), recipient, amount);
    }

    function _distributeToken(IERC20 token, address recipient, uint256 amount) private {
        if (address(token) == address(0) || recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        token.safeTransfer(recipient, amount);
        emit Distributed(address(token), recipient, amount);
    }

    function _authorizeUpgrade(address) internal override onlyRole(TIMELOCK_ROLE) {}
}
