// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract NexoraCore is Initializable, AccessControl, Pausable, ReentrancyGuard, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    bytes32 public constant MERCHANT_MANAGER_ROLE = keccak256("MERCHANT_MANAGER_ROLE");
    bytes32 public constant TIMELOCK_ROLE = keccak256("TIMELOCK_ROLE");
    bytes32 public constant REFUND_MANAGER_ROLE = keccak256("REFUND_MANAGER_ROLE");
    bytes32 public constant DISPUTE_RESOLVER_ROLE = keccak256("DISPUTE_RESOLVER_ROLE");
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");
    bytes32 public constant SETTLER_ROLE = keccak256("SETTLER_ROLE");
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");
    bytes32 public constant PAYMASTER_ROLE = keccak256("PAYMASTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    bytes32 private constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant PAYMENT_TYPEHASH =
        keccak256("NexoraPayment(bytes32 paymentId,address merchant,address token,uint256 amount,uint256 expiry)");
    bytes32 private constant QR_TYPEHASH =
        keccak256("NexoraQRCode(address merchant,uint256 amount,uint256 expiry,bytes32 nonce)");

    function verifyQrPayload(
        address merchant,
        uint256 amount,
        uint256 expiry,
        bytes32 nonce,
        bytes calldata signature,
        address merchantWallet
    ) public view returns (bool) {
        if (expiry < block.timestamp) revert ExpiredSignature();
        bytes32 structHash = keccak256(abi.encode(QR_TYPEHASH, merchant, amount, expiry, nonce));
        bytes32 digest = MessageHashUtils.toTypedDataHash(_domainSeparator(), structHash);
        return ECDSA.recoverCalldata(digest, signature) == merchantWallet;
    }

    uint8 private constant STATUS_ESCROWED = 1;
    uint8 private constant STATUS_QUEUED = 2;
    uint8 private constant STATUS_RELEASED = 3;
    uint8 private constant STATUS_REFUNDED = 4;
    uint8 private constant STATUS_DISPUTED = 5;

    uint16 public constant MAX_FEE_BPS = 1_000;

    struct Merchant {
        address wallet;
        uint16 feeBps;
        uint8 settlementPreference;
        bool kycApproved;
        bool active;
    }

    struct Payment {
        address payer;
        address merchant;
        address token;
        uint128 amount;
        uint16 feeBps;
        uint64 queuedAt;
        uint64 createdAt;
        uint8 status;
    }

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

    address public feeRecipient;
    address public entryPoint;
    uint64 public minPaymentInterval;
    uint64 public settlementDelay;
    uint128 public defaultDailyLimit;
    mapping(address => Merchant) public merchants;
    mapping(bytes32 => Payment) public payments;
    mapping(address => uint64) public lastPaymentAt;
    mapping(address => bool) public supportedToken;
    mapping(address => bool) public sponsoredAccount;
    mapping(address => uint128) public merchantDailyLimit;
    mapping(address => uint128) public merchantDailyTotal;

    event MerchantRegistered(address indexed merchant, address indexed wallet, uint16 feeBps, bool kycApproved, bool active, uint8 settlementPreference);
    event MerchantUpdated(address indexed merchant, address indexed wallet, uint16 feeBps, bool kycApproved, bool active, uint8 settlementPreference);
    event PaymentEscrowed(bytes32 indexed paymentId, address indexed payer, address indexed merchant, address token, uint256 amount, uint256 feeBps);
    event PaymentQueued(bytes32 indexed paymentId, address indexed merchant);
    event PaymentReleased(bytes32 indexed paymentId, address indexed merchant, address indexed token, uint256 netAmount, uint256 feeAmount);
    event PaymentRefunded(bytes32 indexed paymentId);
    event DisputeRaised(bytes32 indexed paymentId);
    event DisputeResolved(bytes32 indexed paymentId, bool refund);
    event FeeRecipientUpdated(address indexed recipient);
    event SupportedTokenUpdated(address indexed token, bool enabled);
    event PaymentSettingsUpdated(uint64 minPaymentInterval, uint64 settlementDelay, uint128 defaultDailyLimit);
    event MerchantDailyLimitUpdated(address indexed merchant, uint128 limit);
    event GasSponsorshipUpdated(address indexed account, bool sponsored);
    event PaidByRelayer(bytes32 indexed paymentId, address indexed payer, address indexed relayer);
    event RewardsDistributed(address indexed token, address indexed recipient, uint256 amount);
    event TreasuryWithdrawn(address indexed token, address indexed recipient, uint256 amount);

    error ZeroAddress();
    error ZeroAmount();
    error DuplicatePayment();
    error InvalidPayment();
    error InvalidSignature();
    error ExpiredSignature();
    error UnsupportedToken();
    error RateLimited();
    error SettlementPending();
    error MerchantInactive();
    error KycRequired();
    error InvalidFee();
    error InvalidRole();
    error Unauthorized();
    error TransferFailed();
    error PaymentNotQueued();
    error InvalidDeadline();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address admin,
        address timelock,
        address platformFeeRecipient,
        address paymasterEntryPoint,
        uint64 paymentInterval,
        uint64 settlementDelaySeconds,
        uint128 dailyLimit
    ) external initializer {
        if (
            admin == address(0) ||
            timelock == address(0) ||
            platformFeeRecipient == address(0) ||
            paymasterEntryPoint == address(0) ||
            dailyLimit == 0
        ) {
            revert ZeroAddress();
        }

        feeRecipient = platformFeeRecipient;
        entryPoint = paymasterEntryPoint;
        minPaymentInterval = paymentInterval;
        settlementDelay = settlementDelaySeconds;
        defaultDailyLimit = dailyLimit;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MERCHANT_MANAGER_ROLE, admin);
        _grantRole(REFUND_MANAGER_ROLE, admin);
        _grantRole(DISPUTE_RESOLVER_ROLE, admin);
        _grantRole(SETTLER_ROLE, admin);
        _grantRole(TREASURY_ROLE, admin);
        _grantRole(PAYMASTER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(TIMELOCK_ROLE, timelock);
    }

    function registerMerchant(
        address merchant,
        address wallet,
        uint16 feeBps,
        uint8 settlementPreference,
        bool kycApproved,
        bool active
    ) external onlyRole(MERCHANT_MANAGER_ROLE) {
        if (merchant == address(0) || wallet == address(0)) revert ZeroAddress();
        if (feeBps > MAX_FEE_BPS) revert InvalidFee();
        if (merchants[merchant].wallet != address(0)) revert InvalidPayment();

        merchants[merchant] = Merchant({
            wallet: wallet,
            feeBps: feeBps,
            settlementPreference: settlementPreference,
            kycApproved: kycApproved,
            active: active
        });

        emit MerchantRegistered(merchant, wallet, feeBps, kycApproved, active, settlementPreference);
    }

    function updateMerchant(
        address merchant,
        address wallet,
        bool kycApproved,
        bool active,
        uint8 settlementPreference
    ) external onlyRole(MERCHANT_MANAGER_ROLE) {
        if (merchant == address(0) || wallet == address(0)) revert ZeroAddress();
        Merchant storage data = merchants[merchant];
        if (data.wallet == address(0)) revert InvalidPayment();

        data.wallet = wallet;
        data.kycApproved = kycApproved;
        data.active = active;
        data.settlementPreference = settlementPreference;

        emit MerchantUpdated(merchant, wallet, data.feeBps, kycApproved, active, settlementPreference);
    }

    function updateMerchantFee(address merchant, uint16 feeBps) external onlyRole(TIMELOCK_ROLE) {
        if (feeBps > MAX_FEE_BPS) revert InvalidFee();
        Merchant storage data = merchants[merchant];
        if (data.wallet == address(0)) revert InvalidPayment();
        data.feeBps = feeBps;
        emit MerchantUpdated(merchant, data.wallet, feeBps, data.kycApproved, data.active, data.settlementPreference);
    }

    function setMerchantActive(address merchant, bool active) external onlyRole(MERCHANT_MANAGER_ROLE) {
        Merchant storage data = merchants[merchant];
        if (data.wallet == address(0)) revert InvalidPayment();
        data.active = active;
        emit MerchantUpdated(merchant, data.wallet, data.feeBps, data.kycApproved, active, data.settlementPreference);
    }

    function setMerchantKyc(address merchant, bool approved) external onlyRole(MERCHANT_MANAGER_ROLE) {
        Merchant storage data = merchants[merchant];
        if (data.wallet == address(0)) revert InvalidPayment();
        data.kycApproved = approved;
        emit MerchantUpdated(merchant, data.wallet, data.feeBps, approved, data.active, data.settlementPreference);
    }

    function setFeeRecipient(address recipient) external onlyRole(TIMELOCK_ROLE) {
        if (recipient == address(0)) revert ZeroAddress();
        feeRecipient = recipient;
        emit FeeRecipientUpdated(recipient);
    }

    function setSupportedToken(address token, bool enabled) external onlyRole(TIMELOCK_ROLE) {
        if (token == address(0)) revert ZeroAddress();
        supportedToken[token] = enabled;
        emit SupportedTokenUpdated(token, enabled);
    }

    function setPaymentSettings(uint64 paymentInterval, uint64 settlementDelaySeconds, uint128 dailyLimit) external onlyRole(TIMELOCK_ROLE) {
        if (dailyLimit == 0) revert InvalidPayment();
        minPaymentInterval = paymentInterval;
        settlementDelay = settlementDelaySeconds;
        defaultDailyLimit = dailyLimit;
        emit PaymentSettingsUpdated(paymentInterval, settlementDelaySeconds, dailyLimit);
    }

    function setMerchantDailyLimit(address merchant, uint128 limit) external onlyRole(TIMELOCK_ROLE) {
        if (merchant == address(0) || limit == 0) revert InvalidPayment();
        merchantDailyLimit[merchant] = limit;
        emit MerchantDailyLimitUpdated(merchant, limit);
    }

    function sponsorGas(address account, bool sponsored) external onlyRole(PAYMASTER_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        sponsoredAccount[account] = sponsored;
        emit GasSponsorshipUpdated(account, sponsored);
    }

    function payETH(
        bytes32 paymentId,
        address merchant,
        uint256 expiry,
        bytes calldata merchantSignature
    ) external payable nonReentrant whenNotPaused returns (bytes32) {
        return _createPayment(paymentId, msg.sender, merchant, address(0), msg.value, expiry, merchantSignature);
    }

    function payToken(
        bytes32 paymentId,
        address merchant,
        address token,
        uint256 amount,
        uint256 expiry,
        bytes calldata merchantSignature
    ) external nonReentrant whenNotPaused returns (bytes32) {
        if (token == address(0)) revert UnsupportedToken();
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        return _createPayment(paymentId, msg.sender, merchant, token, amount, expiry, merchantSignature);
    }

    function relayerPayment(
        bytes32 paymentId,
        address payer,
        address merchant,
        address token,
        uint256 amount,
        uint256 expiry,
        bytes calldata merchantSignature
    ) external onlyRole(RELAYER_ROLE) nonReentrant whenNotPaused returns (bytes32) {
        if (!sponsoredAccount[msg.sender]) revert Unauthorized();
        if (token == address(0)) revert UnsupportedToken();
        IERC20(token).safeTransferFrom(payer, address(this), amount);
        bytes32 id = _createPayment(paymentId, payer, merchant, token, amount, expiry, merchantSignature);
        emit PaidByRelayer(id, payer, msg.sender);
        return id;
    }

    function releasePayment(bytes32 paymentId) external nonReentrant whenNotPaused {
        Payment storage payment = payments[paymentId];
        if (payment.status != STATUS_ESCROWED || msg.sender != payment.merchant) revert InvalidPayment();
        payment.status = STATUS_QUEUED;
        payment.queuedAt = uint64(block.timestamp);
        emit PaymentQueued(paymentId, msg.sender);
    }

    function batchSettlement(bytes32[] calldata paymentIds) external onlyRole(SETTLER_ROLE) nonReentrant whenNotPaused {
        uint256 length = paymentIds.length;
        for (uint256 i; i < length; ) {
            _processSettlement(paymentIds[i]);
            unchecked {
                ++i;
            }
        }
    }

    function refundPayment(bytes32 paymentId) external onlyRole(REFUND_MANAGER_ROLE) nonReentrant {
        Payment storage payment = payments[paymentId];
        if (payment.status != STATUS_ESCROWED && payment.status != STATUS_QUEUED && payment.status != STATUS_DISPUTED) revert InvalidPayment();
        payment.status = STATUS_REFUNDED;
        _transferFunds(payment.token, payment.payer, payment.amount);
        emit PaymentRefunded(paymentId);
    }

    function disputePayment(bytes32 paymentId) external nonReentrant {
        Payment storage payment = payments[paymentId];
        if (payment.status != STATUS_ESCROWED) revert InvalidPayment();
        if (msg.sender != payment.payer && msg.sender != payment.merchant) revert Unauthorized();
        payment.status = STATUS_DISPUTED;
        emit DisputeRaised(paymentId);
    }

    function resolveDispute(bytes32 paymentId, bool refund) external onlyRole(DISPUTE_RESOLVER_ROLE) nonReentrant {
        Payment storage payment = payments[paymentId];
        if (payment.status != STATUS_DISPUTED) revert InvalidPayment();
        if (refund) {
            payment.status = STATUS_REFUNDED;
            _transferFunds(payment.token, payment.payer, payment.amount);
        } else {
            payment.status = STATUS_RELEASED;
            _settlePayment(paymentId, payment);
        }
        emit DisputeResolved(paymentId, refund);
    }

    function distributeRewards(address token, address recipient, uint256 amount) external onlyRole(TREASURY_ROLE) nonReentrant {
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        IERC20(token).safeTransfer(recipient, amount);
        emit RewardsDistributed(token, recipient, amount);
    }

    function treasuryWithdrawETH(address payable recipient, uint256 amount) external onlyRole(TIMELOCK_ROLE) nonReentrant {
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        (bool success, ) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed();
        emit TreasuryWithdrawn(address(0), recipient, amount);
    }

    function treasuryWithdrawToken(address token, address recipient, uint256 amount) external onlyRole(TIMELOCK_ROLE) nonReentrant {
        if (token == address(0) || recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        IERC20(token).safeTransfer(recipient, amount);
        emit TreasuryWithdrawn(token, recipient, amount);
    }

    function validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32,
        uint256 maxCost
    ) external view returns (bytes memory context, uint256 validationData) {
        if (msg.sender != entryPoint) revert Unauthorized();
        if (!sponsoredAccount[userOp.sender] || address(this).balance < maxCost) {
            return ("", 1);
        }
        return (abi.encode(userOp.sender, maxCost), 0);
    }

    function postOp(bytes calldata, uint256) external view {
        if (msg.sender != entryPoint) revert Unauthorized();
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    receive() external payable {}

    function _createPayment(
        bytes32 paymentId,
        address payer,
        address merchant,
        address token,
        uint256 amount,
        uint256 expiry,
        bytes calldata merchantSignature
    ) private returns (bytes32) {
        if (payer == address(0) || merchant == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (payments[paymentId].payer != address(0)) revert DuplicatePayment();
        if (expiry < block.timestamp) revert ExpiredSignature();

        Merchant storage merchantData = merchants[merchant];
        if (merchantData.wallet == address(0)) revert InvalidPayment();
        if (!merchantData.kycApproved) revert KycRequired();
        if (!merchantData.active) revert MerchantInactive();
        if (token != address(0) && !supportedToken[token]) revert UnsupportedToken();

        uint64 previous = lastPaymentAt[payer];
        if (minPaymentInterval != 0 && previous + minPaymentInterval > block.timestamp) revert RateLimited();
        lastPaymentAt[payer] = uint64(block.timestamp);

        _verifyMerchantSignature(paymentId, merchant, token, amount, expiry, merchantSignature, merchantData.wallet);

        payments[paymentId] = Payment({
            payer: payer,
            merchant: merchant,
            token: token,
            amount: uint128(amount),
            feeBps: merchantData.feeBps,
            queuedAt: 0,
            createdAt: uint64(block.timestamp),
            status: STATUS_ESCROWED
        });

        emit PaymentEscrowed(paymentId, payer, merchant, token, amount, merchantData.feeBps);
        return paymentId;
    }

    function _verifyMerchantSignature(
        bytes32 paymentId,
        address merchant,
        address token,
        uint256 amount,
        uint256 expiry,
        bytes calldata signature,
        address merchantWallet
    ) private view {
        bytes32 structHash = keccak256(abi.encode(PAYMENT_TYPEHASH, paymentId, merchant, token, amount, expiry));
        bytes32 digest = MessageHashUtils.toTypedDataHash(_domainSeparator(), structHash);
        address signer = ECDSA.recoverCalldata(digest, signature);
        if (signer != merchantWallet) revert InvalidSignature();
    }

    function _processSettlement(bytes32 paymentId) private {
        Payment storage payment = payments[paymentId];
        if (payment.status != STATUS_QUEUED) revert InvalidPayment();
        if (payment.queuedAt + settlementDelay > block.timestamp) revert SettlementPending();
        _checkDailyLimit(payment);
        payment.status = STATUS_RELEASED;
        _settlePayment(paymentId, payment);
    }

    function _settlePayment(bytes32 paymentId, Payment storage payment) private {
        uint256 fee = (uint256(payment.amount) * payment.feeBps) / 10_000;
        uint256 net = uint256(payment.amount) - fee;
        if (payment.token == address(0)) {
            _transferFunds(address(0), payment.merchant, net);
            if (fee != 0) _transferFunds(address(0), feeRecipient, fee);
        } else {
            IERC20(payment.token).safeTransfer(payment.merchant, net);
            if (fee != 0) IERC20(payment.token).safeTransfer(feeRecipient, fee);
        }
        emit PaymentReleased(paymentId, payment.merchant, payment.token, net, fee);
    }

    function _transferFunds(address token, address recipient, uint256 amount) private {
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) return;
        if (token == address(0)) {
            (bool success, ) = payable(recipient).call{value: amount}("");
            if (!success) revert TransferFailed();
            return;
        }
        IERC20(token).safeTransfer(recipient, amount);
    }

    function _checkDailyLimit(Payment storage payment) private {
        uint128 limit = merchantDailyLimit[payment.merchant];
        if (limit == 0) {
            limit = defaultDailyLimit;
        }
        if (limit != 0) {
            uint128 dayTotal = merchantDailyTotal[payment.merchant] + payment.amount;
            if (dayTotal > limit) revert InvalidPayment();
            merchantDailyTotal[payment.merchant] = dayTotal;
        }
    }

    function _domainSeparator() private view returns (bytes32) {
        return keccak256(abi.encode(DOMAIN_TYPEHASH, keccak256(bytes("NexoraCore")), keccak256(bytes("1")), block.chainid, address(this)));
    }

    function _authorizeUpgrade(address) internal override onlyRole(TIMELOCK_ROLE) {}
}
