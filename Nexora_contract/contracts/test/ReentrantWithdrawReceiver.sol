// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {NexoraSafeWallet} from "../NexoraWalletSystem.sol";

contract ReentrantWithdrawReceiver {
    NexoraSafeWallet public immutable wallet;
    bytes private reentrantCall;
    bool private entered;

    constructor(NexoraSafeWallet targetWallet) {
        wallet = targetWallet;
    }

    function setReentrantCall(bytes calldata callData) external {
        reentrantCall = callData;
    }

    receive() external payable {
        if (!entered) {
            entered = true;
            (bool success,) = address(wallet).call(reentrantCall);
            require(success, "reentrant call failed");
        }
    }
}
