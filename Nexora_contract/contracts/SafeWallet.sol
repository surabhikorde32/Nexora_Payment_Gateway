// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SafeWallet
/// @author Nexora
/// @notice Custodial ETH vault for the Nexora payment gateway.
/// @dev Owner is immutable to minimize storage reads and avoid ownership mutation risk.
contract SafeWallet is Pausable, ReentrancyGuard {
    /// @notice Account authorized to withdraw funds and control emergency pause state.
    address public immutable owner;

    /// @notice Emitted when ETH enters the wallet.
    /// @param sender Account that sent ETH.
    /// @param amount Amount deposited.
    event Deposit(address indexed sender, uint256 amount);

    /// @notice Emitted when ETH leaves the wallet.
    /// @param receiver Account that received ETH.
    /// @param amount Amount withdrawn.
    event Withdraw(address indexed receiver, uint256 amount);

    /// @notice Emitted when the wallet enters emergency pause mode.
    event WalletPaused(address indexed account);

    /// @notice Emitted when the wallet exits emergency pause mode.
    event WalletUnpaused(address indexed account);

    error Unauthorized();
    error ZeroAddress();
    error ZeroAmount();
    error InsufficientBalance();
    error EtherTransferFailed();

    /// @param initialOwner Owner authorized for sensitive operations.
    constructor(address initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddress();
        owner = initialOwner;
    }

    /// @notice Accepts direct ETH transfers while the wallet is active.
    receive() external payable whenNotPaused {
        _deposit();
    }

    /// @notice Accepts ETH sent with unknown calldata while the wallet is active.
    fallback() external payable whenNotPaused {
        _deposit();
    }

    /// @notice Explicitly deposits native ETH into the wallet.
    function deposit() external payable whenNotPaused {
        _deposit();
    }

    /// @notice Withdraws ETH to a recipient selected by the owner.
    /// @param recipient Account receiving native ETH.
    /// @param amount Amount of native ETH to withdraw.
    function withdraw(address payable recipient, uint256 amount) external onlyOwner whenNotPaused nonReentrant {
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (address(this).balance < amount) revert InsufficientBalance();

        (bool success,) = recipient.call{value: amount}("");
        if (!success) revert EtherTransferFailed();

        emit Withdraw(recipient, amount);
    }

    /// @notice Pauses deposits and withdrawals during emergencies.
    function pause() external onlyOwner {
        _pause();
        emit WalletPaused(msg.sender);
    }

    /// @notice Restores deposits and withdrawals.
    function unpause() external onlyOwner {
        _unpause();
        emit WalletUnpaused(msg.sender);
    }

    /// @notice Returns the wallet's native ETH balance.
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function _checkOwner() private view {
        if (msg.sender != owner) revert Unauthorized();
    }

    function _deposit() private {
        if (msg.value == 0) revert ZeroAmount();
        emit Deposit(msg.sender, msg.value);
    }

    modifier onlyOwner() {
        _checkOwner();
        _;
    }
}
