// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

abstract contract TransactionExecutor is ReentrancyGuard {
    error ExecutionFailed(bytes returndata);
    error ZeroAddress();

    function _execute(address target, uint256 value, bytes memory data) internal nonReentrant returns (bytes memory result) {
        if (target == address(0)) revert ZeroAddress();

        (bool success, bytes memory returndata) = target.call{value: value}(data);
        if (!success) revert ExecutionFailed(returndata);
        return returndata;
    }
}
