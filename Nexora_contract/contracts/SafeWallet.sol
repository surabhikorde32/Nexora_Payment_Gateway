// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SafeWallet is Pausable, ReentrancyGuard {
    address public immutable owner;

    event Deposit(address indexed sender, uint256 amount);
    event Withdraw(address indexed receiver, uint256 amount);
    event WalletPaused(address indexed account);
    event WalletUnpaused(address indexed account);

    error Unauthorized();
    error ZeroAddress();
    error ZeroAmount();
    error InsufficientBalance();
    error EtherTransferFailed();

    constructor(address initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddress();
        owner = initialOwner;
    }

    receive() external payable whenNotPaused {
        _deposit();
    }

    fallback() external payable whenNotPaused {
        _deposit();
    }

    function deposit() external payable whenNotPaused {
        _deposit();
    }

    function withdraw(address payable recipient, uint256 amount) external onlyOwner whenNotPaused nonReentrant {
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (address(this).balance < amount) revert InsufficientBalance();

        (bool success,) = recipient.call{value: amount}("");
        if (!success) revert EtherTransferFailed();

        emit Withdraw(recipient, amount);
    }

    function pause() external onlyOwner {
        _pause();
        emit WalletPaused(msg.sender);
    }

    function unpause() external onlyOwner {
        _unpause();
        emit WalletUnpaused(msg.sender);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function _deposit() private {
        if (msg.value == 0) revert ZeroAmount();
        emit Deposit(msg.sender, msg.value);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }
}
