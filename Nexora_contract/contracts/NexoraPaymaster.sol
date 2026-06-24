// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract NexoraPaymaster is Initializable, AccessControl, ReentrancyGuard, UUPSUpgradeable {
    struct UserOperation {
        address sender;
        uint256 nonce;
        bytes initCode;
        bytes callData;
        bytes32 accountGasLimits;
        uint256 preVerificationGas;
        bytes32 gasFees;
        bytes paymasterAndData;
        bytes signature;
    }

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant SPONSOR_MANAGER_ROLE = keccak256("SPONSOR_MANAGER_ROLE");
    bytes32 public constant TIMELOCK_ROLE = keccak256("TIMELOCK_ROLE");
    uint256 private constant PAYMASTER_VALIDATION_FAILED = 1;

    address public entryPoint;
    mapping(address account => bool sponsored) public sponsoredAccount;

    event EntryPointUpdated(address indexed entryPoint);
    event SponsorshipUpdated(address indexed account, bool sponsored);
    event Deposited(uint256 amount);
    event Withdrawn(address indexed recipient, uint256 amount);

    error ZeroAddress();
    error ZeroAmount();
    error Unauthorized();
    error TransferFailed();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address entryPoint_, address admin, address timelock) external initializer {
        if (entryPoint_ == address(0) || admin == address(0) || timelock == address(0)) revert ZeroAddress();
        entryPoint = entryPoint_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(SPONSOR_MANAGER_ROLE, admin);
        _grantRole(TIMELOCK_ROLE, timelock);
    }

    receive() external payable {
        emit Deposited(msg.value);
    }

    function setSponsoredAccount(address account, bool sponsored) external onlyRole(SPONSOR_MANAGER_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        sponsoredAccount[account] = sponsored;
        emit SponsorshipUpdated(account, sponsored);
    }

    function setEntryPoint(address entryPoint_) external onlyRole(TIMELOCK_ROLE) {
        if (entryPoint_ == address(0)) revert ZeroAddress();
        entryPoint = entryPoint_;
        emit EntryPointUpdated(entryPoint_);
    }

    function validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32,
        uint256 maxCost
    ) external view returns (bytes memory context, uint256 validationData) {
        if (msg.sender != entryPoint) revert Unauthorized();
        if (!sponsoredAccount[userOp.sender] || address(this).balance < maxCost) {
            return ("", PAYMASTER_VALIDATION_FAILED);
        }
        return (abi.encode(userOp.sender, maxCost), 0);
    }

    function postOp(bytes calldata, uint256) external view {
        if (msg.sender != entryPoint) revert Unauthorized();
    }

    function withdraw(address payable recipient, uint256 amount) external onlyRole(TIMELOCK_ROLE) nonReentrant {
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        (bool success,) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed();
        emit Withdrawn(recipient, amount);
    }

    function _authorizeUpgrade(address) internal override onlyRole(TIMELOCK_ROLE) {}
}
