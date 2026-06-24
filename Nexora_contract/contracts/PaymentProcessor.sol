// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MerchantRegistry} from "./MerchantRegistry.sol";

contract PaymentProcessor is Initializable, AccessControl, Pausable, ReentrancyGuard, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant REFUND_MANAGER_ROLE = keccak256("REFUND_MANAGER_ROLE");
    bytes32 public constant DISPUTE_RESOLVER_ROLE = keccak256("DISPUTE_RESOLVER_ROLE");
    bytes32 public constant TIMELOCK_ROLE = keccak256("TIMELOCK_ROLE");
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");
    bytes32 private constant PAYMENT_TYPEHASH =
        keccak256("NexoraPayment(bytes32 paymentId,address merchant,address token,uint256 amount,uint256 chainId,address processor)");

    struct Payment {
        address payer;
        address merchant;
        address token;
        uint256 amount;
        uint256 fee;
        uint8 status;
    }

    MerchantRegistry public registry;
    address public feeRecipient;
    address public paymaster;
    address public entryPoint;
    mapping(bytes32 paymentId => Payment data) public payments;

    event PaymasterRegistered(address indexed paymaster);
    event EntryPointRegistered(address indexed entryPoint);
    event PaymentEscrowed(bytes32 indexed paymentId, address indexed payer, address indexed merchant, address token, uint256 amount, uint256 fee);
    event PaymentReleased(bytes32 indexed paymentId);
    event PaymentRefunded(bytes32 indexed paymentId);
    event DisputeRaised(bytes32 indexed paymentId);
    event DisputeResolved(bytes32 indexed paymentId, bool refund);

    error ZeroAddress();
    error ZeroAmount();
    error DuplicatePayment();
    error InvalidPayment();
    error InvalidSignature();
    error TransferFailed();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        MerchantRegistry merchantRegistry,
        address platformFeeRecipient,
        address admin,
        address timelock
    ) external initializer {
        if (address(merchantRegistry) == address(0) || platformFeeRecipient == address(0) || admin == address(0) || timelock == address(0)) {
            revert ZeroAddress();
        }
        registry = merchantRegistry;
        feeRecipient = platformFeeRecipient;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(REFUND_MANAGER_ROLE, admin);
        _grantRole(DISPUTE_RESOLVER_ROLE, admin);
        _grantRole(TIMELOCK_ROLE, timelock);
    }

    function setEntryPoint(address _entryPoint) external onlyRole(TIMELOCK_ROLE) {
        if (_entryPoint == address(0)) revert ZeroAddress();
        entryPoint = _entryPoint;
        emit EntryPointRegistered(_entryPoint);
    }

    function setPaymaster(address _paymaster) external onlyRole(TIMELOCK_ROLE) {
        if (_paymaster == address(0)) revert ZeroAddress();
        paymaster = _paymaster;
        emit PaymasterRegistered(_paymaster);
    }

    function authorizeRelayer(address relayer) external onlyRole(ADMIN_ROLE) {
        if (relayer == address(0)) revert ZeroAddress();
        _grantRole(RELAYER_ROLE, relayer);
    }

    function deauthorizeRelayer(address relayer) external onlyRole(ADMIN_ROLE) {
        _revokeRole(RELAYER_ROLE, relayer);
    }

    function gaslessPay(
        bytes32 paymentId,
        address payer,
        address merchant,
        address token,
        uint256 amount,
        bytes calldata merchantSignature,
        bytes calldata paymasterData
    ) external onlyRole(RELAYER_ROLE) nonReentrant whenNotPaused returns (bytes32) {
        if (payer == address(0)) revert ZeroAddress();
        if (paymasterData.length != 0 && paymaster == address(0)) revert ZeroAddress();
        return _escrowPayment(paymentId, payer, merchant, token, amount, merchantSignature);
    }

    receive() external payable {}

    function pay(
        bytes32 paymentId,
        address merchant,
        address token,
        uint256 amount,
        bytes calldata merchantSignature
    ) external payable nonReentrant whenNotPaused returns (bytes32) {
        return _escrowPayment(paymentId, msg.sender, merchant, token, amount, merchantSignature);
    }

    function escrowPayment(
        bytes32 paymentId,
        address merchant,
        address token,
        uint256 amount,
        bytes calldata merchantSignature
    ) public payable nonReentrant whenNotPaused returns (bytes32) {
        return _escrowPayment(paymentId, msg.sender, merchant, token, amount, merchantSignature);
    }

    function _escrowPayment(
        bytes32 paymentId,
        address payer,
        address merchant,
        address token,
        uint256 amount,
        bytes calldata merchantSignature
    ) private returns (bytes32) {
        if (merchant == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (payments[paymentId].payer != address(0)) revert DuplicatePayment();

        (address merchantWallet, uint16 feeBps) = registry.settlementFor(merchant);
        _verifyMerchantAuthorization(paymentId, merchant, token, amount, merchantWallet, merchantSignature);

        uint256 fee = (amount * feeBps) / 10_000;
        payments[paymentId] = Payment({
            payer: payer,
            merchant: merchant,
            token: token,
            amount: amount,
            fee: fee,
            status: 1
        });

        if (token == address(0)) {
            if (msg.value != amount) revert InvalidPayment();
        } else {
            if (msg.value != 0) revert InvalidPayment();
            IERC20(token).safeTransferFrom(payer, address(this), amount);
        }

        emit PaymentEscrowed(paymentId, payer, merchant, token, amount, fee);
        return paymentId;
    }

    function releasePayment(bytes32 paymentId) public nonReentrant whenNotPaused {
        Payment storage payment = payments[paymentId];
        if (payment.status != 1 || msg.sender != payment.merchant) revert InvalidPayment();
        payment.status = 2;
        _settle(paymentId, payment);
        emit PaymentReleased(paymentId);
    }

    function refundPayment(bytes32 paymentId) public onlyRole(REFUND_MANAGER_ROLE) nonReentrant {
        Payment storage payment = payments[paymentId];
        if (payment.status != 1 && payment.status != 4) revert InvalidPayment();
        payment.status = 3;
        _transfer(payment.token, payment.payer, payment.amount);
        emit PaymentRefunded(paymentId);
    }

    function raiseDispute(bytes32 paymentId) external {
        Payment storage payment = payments[paymentId];
        if (payment.status != 1 || (msg.sender != payment.payer && msg.sender != payment.merchant)) {
            revert InvalidPayment();
        }
        payment.status = 4;
        emit DisputeRaised(paymentId);
    }

    function resolveDispute(bytes32 paymentId, bool refund) external onlyRole(DISPUTE_RESOLVER_ROLE) nonReentrant {
        Payment storage payment = payments[paymentId];
        if (payment.status != 4) revert InvalidPayment();
        payment.status = refund ? 3 : 2;
        if (refund) {
            _transfer(payment.token, payment.payer, payment.amount);
        } else {
            _settle(paymentId, payment);
        }
        emit DisputeResolved(paymentId, refund);
    }

    function batchSettlement(bytes32[] calldata paymentIds) external nonReentrant whenNotPaused {
        uint256 length = paymentIds.length;
        for (uint256 i; i < length;) {
            Payment storage payment = payments[paymentIds[i]];
            if (payment.status != 1 || msg.sender != payment.merchant) revert InvalidPayment();
            payment.status = 2;
            _settle(paymentIds[i], payment);
            emit PaymentReleased(paymentIds[i]);
            unchecked {
                ++i;
            }
        }
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function qrPayloadHash(
        bytes32 paymentId,
        address merchant,
        address token,
        uint256 amount
    ) public view returns (bytes32) {
        return MessageHashUtils.toTypedDataHash(
            _domainSeparator(),
            keccak256(abi.encode(PAYMENT_TYPEHASH, paymentId, merchant, token, amount, block.chainid, address(this)))
        );
    }

    function _verifyMerchantAuthorization(
        bytes32 paymentId,
        address merchant,
        address token,
        uint256 amount,
        address merchantWallet,
        bytes calldata signature
    ) private view {
        if (ECDSA.recoverCalldata(qrPayloadHash(paymentId, merchant, token, amount), signature) != merchantWallet) {
            revert InvalidSignature();
        }
    }

    function _settle(bytes32, Payment storage payment) private {
        (address merchantWallet,) = registry.settlementFor(payment.merchant);
        _transfer(payment.token, merchantWallet, payment.amount - payment.fee);
        if (payment.fee != 0) _transfer(payment.token, feeRecipient, payment.fee);
    }

    function _transfer(address token, address to, uint256 amount) private {
        if (token == address(0)) {
            (bool success,) = payable(to).call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    function _domainSeparator() private view returns (bytes32) {
        return keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("NexoraPaymentProcessor"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }

    function _authorizeUpgrade(address) internal override onlyRole(TIMELOCK_ROLE) {}
}
