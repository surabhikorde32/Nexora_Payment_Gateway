// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {TransactionExecutor} from "./TransactionExecutor.sol";

contract NexoraSafeWallet is Initializable, TransactionExecutor {
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

    struct WalletTransaction {
        address to;
        uint256 value;
        uint64 deadline;
        uint16 approvals;
        uint8 status;
    }

    bytes32 private constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant TX_TYPEHASH =
        keccak256("NexoraTx(address to,uint256 value,bytes32 dataHash,uint256 nonce,uint256 deadline)");
    bytes32 private constant NAME_HASH = keccak256("NexoraSafeWallet");
    bytes32 private constant VERSION_HASH = keccak256("1");
    uint256 public constant MAX_OWNERS = 16;
    uint256 private constant SIG_VALIDATION_FAILED = 1;

    address public immutable entryPoint;
    uint256 public nonce;
    uint256 public transactionCount;
    uint16 public ownerCount;
    uint16 public threshold;
    mapping(address owner => bool enabled) public isOwner;
    mapping(uint256 txId => WalletTransaction txData) public transactions;
    mapping(uint256 txId => bytes data) private _transactionData;
    mapping(uint256 txId => mapping(address owner => bool approved)) public approvedBy;

    event WalletInitialized(uint16 ownerCount, uint16 threshold);
    event Deposit(address indexed sender, uint256 amount);
    event TransactionSubmitted(uint256 indexed txId, address indexed to, uint256 value);
    event TransactionApproved(uint256 indexed txId, address indexed owner);
    event ApprovalRevoked(uint256 indexed txId, address indexed owner);
    event TransactionExecuted(uint256 indexed txId);
    event TransactionCancelled(uint256 indexed txId);
    event OwnerAdded(address indexed owner);
    event OwnerRemoved(address indexed owner);
    event ThresholdChanged(uint16 threshold);

    error Unauthorized();
    error InvalidOwners();
    error InvalidThreshold();
    error InvalidTransaction();
    error AlreadyApproved();
    error NotApproved();
    error ZeroAmount();
    error InsufficientBalance();
    error ExpiredTransaction();
    error TransferFailed();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address entryPoint_) {
        if (entryPoint_ == address(0)) revert ZeroAddress();
        entryPoint = entryPoint_;
        _disableInitializers();
    }

    receive() external payable {
        if (msg.value == 0) revert ZeroAmount();
        emit Deposit(msg.sender, msg.value);
    }

    function initialize(address[] calldata owners, uint16 walletThreshold) external initializer {
        _setInitialOwners(owners, walletThreshold);
    }

    function deposit() external payable {
        if (msg.value == 0) revert ZeroAmount();
        emit Deposit(msg.sender, msg.value);
    }

    function submitTransaction(
        address to,
        uint256 value,
        bytes calldata data,
        uint64 deadline
    ) external onlyOwner returns (uint256 txId) {
        if (to == address(0)) revert ZeroAddress();
        if (deadline < block.timestamp) revert ExpiredTransaction();

        txId = transactionCount;
        unchecked {
            transactionCount = txId + 1;
        }
        transactions[txId] = WalletTransaction({to: to, value: value, deadline: deadline, approvals: 0, status: 1});
        _transactionData[txId] = data;
        emit TransactionSubmitted(txId, to, value);
    }

    function approveTransaction(uint256 txId) external onlyOwner {
        _approveTransaction(txId, msg.sender);
    }

    function approveTransactionBySig(uint256 txId, bytes calldata signature) external {
        WalletTransaction memory walletTx = _activeTransaction(txId);
        bytes32 txHash = getTransactionHash(walletTx.to, walletTx.value, _transactionData[txId], txId, walletTx.deadline);
        address signer = ECDSA.recoverCalldata(txHash, signature);
        if (!isOwner[signer]) revert Unauthorized();
        _approveTransaction(txId, signer);
    }

    function revokeApproval(uint256 txId) external onlyOwner {
        WalletTransaction storage walletTx = transactions[txId];
        if (walletTx.status != 1) revert InvalidTransaction();
        if (!approvedBy[txId][msg.sender]) revert NotApproved();

        approvedBy[txId][msg.sender] = false;
        unchecked {
            --walletTx.approvals;
        }
        emit ApprovalRevoked(txId, msg.sender);
    }

    function executeTransaction(uint256 txId) external returns (bytes memory result) {
        WalletTransaction storage walletTx = transactions[txId];
        if (walletTx.status != 1) revert InvalidTransaction();
        if (walletTx.deadline < block.timestamp) revert ExpiredTransaction();
        if (walletTx.approvals < threshold) revert Unauthorized();

        walletTx.status = 2;
        unchecked {
            ++nonce;
        }
        result = _execute(walletTx.to, walletTx.value, _transactionData[txId]);
        emit TransactionExecuted(txId);
    }

    function cancelTransaction(uint256 txId) external onlyOwner {
        WalletTransaction storage walletTx = transactions[txId];
        if (walletTx.status != 1) revert InvalidTransaction();
        walletTx.status = 3;
        emit TransactionCancelled(txId);
    }

    function executeSigned(
        address to,
        uint256 value,
        bytes calldata data,
        uint256 deadline,
        bytes calldata signatures
    ) external returns (bytes memory result) {
        if (deadline < block.timestamp) revert ExpiredTransaction();

        uint256 currentNonce = nonce;
        bytes32 txHash = getTransactionHash(to, value, data, currentNonce, deadline);
        if (!_validSignatures(txHash, signatures)) revert Unauthorized();

        unchecked {
            nonce = currentNonce + 1;
        }
        result = _execute(to, value, data);
    }

    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external returns (uint256 validationData) {
        if (msg.sender != entryPoint) revert Unauthorized();
        if (userOp.sender != address(this) || userOp.nonce != nonce) return SIG_VALIDATION_FAILED;
        if (!_validSignatures(MessageHashUtils.toEthSignedMessageHash(userOpHash), userOp.signature)) {
            return SIG_VALIDATION_FAILED;
        }
        unchecked {
            ++nonce;
        }
        if (missingAccountFunds != 0) {
            (bool success,) = payable(msg.sender).call{value: missingAccountFunds}("");
            if (!success) revert TransferFailed();
        }
        return 0;
    }

    function withdraw(address payable recipient, uint256 amount) external onlySelf {
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (address(this).balance < amount) revert InsufficientBalance();

        (bool success,) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    function addOwner(address owner) external onlySelf {
        if (owner == address(0) || isOwner[owner] || ownerCount == MAX_OWNERS) revert InvalidOwners();
        isOwner[owner] = true;
        unchecked {
            ++ownerCount;
        }
        emit OwnerAdded(owner);
    }

    function removeOwner(address owner, uint16 newThreshold) external onlySelf {
        if (!isOwner[owner] || ownerCount == 1) revert InvalidOwners();
        isOwner[owner] = false;
        unchecked {
            --ownerCount;
        }
        _setThreshold(newThreshold);
        emit OwnerRemoved(owner);
    }

    function changeThreshold(uint16 newThreshold) external onlySelf {
        _setThreshold(newThreshold);
    }

    function getTransactionData(uint256 txId) external view returns (bytes memory) {
        return _transactionData[txId];
    }

    function getTransactionHash(
        address to,
        uint256 value,
        bytes memory data,
        uint256 txNonce,
        uint256 deadline
    ) public view returns (bytes32) {
        bytes32 structHash = keccak256(abi.encode(TX_TYPEHASH, to, value, keccak256(data), txNonce, deadline));
        return MessageHashUtils.toTypedDataHash(_domainSeparator(), structHash);
    }

    function _setInitialOwners(address[] calldata owners, uint16 walletThreshold) private {
        uint256 length = owners.length;
        if (length == 0 || length > MAX_OWNERS) revert InvalidOwners();
        if (walletThreshold == 0 || walletThreshold > length) revert InvalidThreshold();

        address previousOwner;
        for (uint256 i; i < length;) {
            address walletOwner = owners[i];
            if (walletOwner == address(0) || walletOwner <= previousOwner) revert InvalidOwners();
            isOwner[walletOwner] = true;
            previousOwner = walletOwner;
            unchecked {
                ++i;
            }
        }
        ownerCount = uint16(length);
        threshold = walletThreshold;
        emit WalletInitialized(uint16(length), walletThreshold);
    }

    function _approveTransaction(uint256 txId, address owner) private {
        WalletTransaction storage walletTx = transactions[txId];
        if (walletTx.status != 1) revert InvalidTransaction();
        if (walletTx.deadline < block.timestamp) revert ExpiredTransaction();
        if (approvedBy[txId][owner]) revert AlreadyApproved();

        approvedBy[txId][owner] = true;
        unchecked {
            ++walletTx.approvals;
        }
        emit TransactionApproved(txId, owner);
    }

    function _activeTransaction(uint256 txId) private view returns (WalletTransaction memory walletTx) {
        walletTx = transactions[txId];
        if (walletTx.status != 1 || walletTx.deadline < block.timestamp) revert InvalidTransaction();
    }

    function _setThreshold(uint16 newThreshold) private {
        if (newThreshold == 0 || newThreshold > ownerCount) revert InvalidThreshold();
        threshold = newThreshold;
        emit ThresholdChanged(newThreshold);
    }

    function _validSignatures(bytes32 txHash, bytes calldata signatures) private view returns (bool) {
        uint256 requiredSignatures = threshold;
        if (signatures.length != requiredSignatures * 65) return false;

        address previousSigner;
        for (uint256 i; i < requiredSignatures;) {
            address signer = ECDSA.recoverCalldata(txHash, signatures[i * 65:(i + 1) * 65]);
            if (signer <= previousSigner || !isOwner[signer]) return false;
            previousSigner = signer;
            unchecked {
                ++i;
            }
        }
        return true;
    }

    function _domainSeparator() private view returns (bytes32) {
        return keccak256(abi.encode(DOMAIN_TYPEHASH, NAME_HASH, VERSION_HASH, block.chainid, address(this)));
    }

    modifier onlyOwner() {
        if (!isOwner[msg.sender]) revert Unauthorized();
        _;
    }

    modifier onlySelf() {
        if (msg.sender != address(this)) revert Unauthorized();
        _;
    }
}
