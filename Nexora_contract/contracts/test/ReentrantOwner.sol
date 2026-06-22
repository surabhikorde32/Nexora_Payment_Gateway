// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SafeWallet} from "../SafeWallet.sol";

/// @dev Test harness used only to validate SafeWallet's reentrancy guard.
contract ReentrantOwner {
    SafeWallet public immutable wallet;
    uint256 public immutable amount;
    bool private _entered;

    error AttackDidNotReenter();

    constructor(uint256 attackAmount) {
        amount = attackAmount;
        wallet = new SafeWallet(address(this));
    }

    receive() external payable {
        if (!_entered) {
            _entered = true;
            wallet.withdraw(payable(address(this)), amount);
        }
    }

    function deposit() external payable {
        wallet.deposit{value: msg.value}();
    }

    function attack() external {
        wallet.withdraw(payable(address(this)), amount);
        if (!_entered) revert AttackDidNotReenter();
    }
}
