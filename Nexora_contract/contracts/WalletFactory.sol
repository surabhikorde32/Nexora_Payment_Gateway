// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {NexoraSafeWallet} from "./NexoraSafeWallet.sol";

contract WalletFactory {
    address public immutable walletImplementation;
    mapping(address account => address wallet) public walletOf;

    event WalletDeployed(address indexed account, address indexed wallet, address indexed implementation, bytes32 salt);

    error ZeroAddress();
    error WalletAlreadyDeployed();
    error DeploymentFailed();

    constructor(address entryPoint) {
        if (entryPoint == address(0)) revert ZeroAddress();
        walletImplementation = address(new NexoraSafeWallet(entryPoint));
    }

    function deployWallet(address account, bytes32 salt) external returns (address wallet) {
        address[] memory owners = new address[](1);
        owners[0] = account;
        return _deployWallet(account, owners, 1, salt);
    }

    function deployMultisigWallet(
        address account,
        address[] calldata owners,
        uint16 threshold,
        bytes32 salt
    ) external returns (address wallet) {
        return _deployWallet(account, owners, threshold, salt);
    }

    function _deployWallet(
        address account,
        address[] memory owners,
        uint16 threshold,
        bytes32 salt
    ) private returns (address wallet) {
        if (account == address(0)) revert ZeroAddress();
        if (walletOf[account] != address(0)) revert WalletAlreadyDeployed();

        bytes32 finalSalt = keccak256(abi.encode(account, salt));
        wallet = Clones.cloneDeterministic(walletImplementation, finalSalt);
        if (wallet.code.length == 0) revert DeploymentFailed();

        NexoraSafeWallet(payable(wallet)).initialize(owners, threshold);
        walletOf[account] = wallet;
        emit WalletDeployed(account, wallet, walletImplementation, finalSalt);
    }

    function predictWallet(address account, bytes32 salt) external view returns (address predicted) {
        if (account == address(0)) revert ZeroAddress();

        bytes32 finalSalt = keccak256(abi.encode(account, salt));
        predicted = Clones.predictDeterministicAddress(walletImplementation, finalSalt, address(this));
    }
}
