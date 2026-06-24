import { expect } from "chai";
import { Signer } from "ethers";
import { ethers, network } from "hardhat";

async function expectRevert(action: Promise<unknown>) {
  let reverted = false;
  try {
    await action;
  } catch {
    reverted = true;
  }
  expect(reverted).to.equal(true);
}

async function now() {
  const block = await ethers.provider.getBlock("latest");
  return BigInt(block!.timestamp);
}

const walletTypes = {
  NexoraTx: [
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "dataHash", type: "bytes32" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" }
  ]
};

const paymentTypes = {
  NexoraPayment: [
    { name: "paymentId", type: "bytes32" },
    { name: "merchant", type: "address" },
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "chainId", type: "uint256" },
    { name: "processor", type: "address" }
  ]
};

async function deployProxy(contractName: string, initArgs: unknown[]) {
  const Implementation = await ethers.getContractFactory(contractName);
  const implementation = await Implementation.deploy();
  const initData = Implementation.interface.encodeFunctionData("initialize", initArgs);
  const Proxy = await ethers.getContractFactory("NexoraProxy");
  const proxy = await Proxy.deploy(await implementation.getAddress(), initData);
  return ethers.getContractAt(contractName, await proxy.getAddress());
}

async function deployWallet(owner: string, entryPoint: string) {
  const factory = await ethers.deployContract("WalletFactory", [entryPoint]);
  const salt = ethers.keccak256(ethers.toUtf8Bytes(`wallet-${owner}`));
  const predicted = await factory.predictWallet(owner, salt);
  await factory.deployWallet(owner, salt);
  return { factory, wallet: await ethers.getContractAt("NexoraSafeWallet", predicted) };
}

async function signWalletTx(
  wallet: any,
  signer: Signer,
  to: string,
  value: bigint,
  data: string,
  nonce: bigint,
  deadline: bigint
) {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  return signer.signTypedData(
    { name: "NexoraSafeWallet", version: "1", chainId, verifyingContract: await wallet.getAddress() },
    walletTypes,
    { to, value, dataHash: ethers.keccak256(data), nonce, deadline }
  );
}

async function signPayment(
  processor: any,
  signer: Signer,
  paymentId: string,
  merchant: string,
  token: string,
  amount: bigint
) {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  return signer.signTypedData(
    { name: "NexoraPaymentProcessor", version: "1", chainId, verifyingContract: await processor.getAddress() },
    paymentTypes,
    { paymentId, merchant, token, amount, chainId, processor: await processor.getAddress() }
  );
}

describe("Nexora production architecture", function () {
  describe("Wallet", function () {
    it("deploys deterministic minimal proxies and prevents duplicates", async function () {
      const [owner, entryPoint] = await ethers.getSigners();
      const factory = await ethers.deployContract("WalletFactory", [entryPoint.address]);
      const salt = ethers.keccak256(ethers.toUtf8Bytes("deterministic"));
      const predicted = await factory.predictWallet(owner.address, salt);

      await factory.deployWallet(owner.address, salt);

      expect(await factory.walletOf(owner.address)).to.equal(predicted);
      await expectRevert(factory.deployWallet(owner.address, salt));
    });

    it("uses on-chain lifecycle approvals before execution", async function () {
      const [owner, recipient, entryPoint] = await ethers.getSigners();
      const { wallet } = await deployWallet(owner.address, entryPoint.address);
      await wallet.deposit({ value: ethers.parseEther("1") });
      const deadline = (await now()) + 3600n;

      await wallet.submitTransaction(recipient.address, ethers.parseEther("0.2"), "0x", deadline);
      await expectRevert(wallet.executeTransaction(0));
      await wallet.approveTransaction(0);
      await wallet.executeTransaction(0);

      expect(await ethers.provider.getBalance(await wallet.getAddress())).to.equal(ethers.parseEther("0.8"));
    });

    it("supports revoke, cancel, owner rotation, and threshold changes through wallet execution", async function () {
      const [owner, newOwner, recipient, entryPoint] = await ethers.getSigners();
      const { wallet } = await deployWallet(owner.address, entryPoint.address);
      const deadline = (await now()) + 3600n;

      await wallet.submitTransaction(recipient.address, 0, "0x", deadline);
      expect(await wallet.getTransactionData(0)).to.equal("0x");
      await wallet.approveTransaction(0);
      await expectRevert(wallet.approveTransaction(0));
      await wallet.revokeApproval(0);
      await expectRevert(wallet.executeTransaction(0));
      await wallet.cancelTransaction(0);
      await expectRevert(wallet.approveTransactionBySig(0, "0x"));

      const addOwnerData = wallet.interface.encodeFunctionData("addOwner", [newOwner.address]);
      const sig = await signWalletTx(wallet, owner, await wallet.getAddress(), 0n, addOwnerData, await wallet.nonce(), deadline);
      await wallet.executeSigned(await wallet.getAddress(), 0, addOwnerData, deadline, sig);

      const thresholdData = wallet.interface.encodeFunctionData("changeThreshold", [2]);
      const thresholdSig = await signWalletTx(wallet, owner, await wallet.getAddress(), 0n, thresholdData, await wallet.nonce(), deadline);
      await wallet.executeSigned(await wallet.getAddress(), 0, thresholdData, deadline, thresholdSig);

      expect(await wallet.isOwner(newOwner.address)).to.equal(true);
      expect(await wallet.threshold()).to.equal(2n);

      const removeOwnerData = wallet.interface.encodeFunctionData("removeOwner", [newOwner.address, 1]);
      const removeNonce = await wallet.nonce();
      const walletAddress = await wallet.getAddress();
      const removeSigs = await Promise.all(
        [owner, newOwner]
          .sort((a, b) => a.address.localeCompare(b.address))
          .map((signer) => signWalletTx(wallet, signer, walletAddress, 0n, removeOwnerData, removeNonce, deadline))
      );
      await wallet.executeSigned(walletAddress, 0, removeOwnerData, deadline, ethers.concat(removeSigs));
      expect(await wallet.isOwner(newOwner.address)).to.equal(false);
      expect(await wallet.threshold()).to.equal(1n);
    });

    it("rejects multisig bypass, duplicate signatures, wrong nonce, wrong chain, and replay", async function () {
      const [account, ownerA, ownerB, ownerC, recipient, entryPoint] = await ethers.getSigners();
      const owners = [ownerA.address, ownerB.address, ownerC.address].sort((a, b) => a.localeCompare(b));
      const signerByAddress = new Map([ownerA, ownerB, ownerC].map((signer) => [signer.address, signer]));
      const factory = await ethers.deployContract("WalletFactory", [entryPoint.address]);
      const salt = ethers.keccak256(ethers.toUtf8Bytes("multisig"));
      const predicted = await factory.predictWallet(account.address, salt);
      await factory.deployMultisigWallet(account.address, owners, 2, salt);
      const wallet = await ethers.getContractAt("NexoraSafeWallet", predicted);
      await wallet.deposit({ value: ethers.parseEther("1") });

      const deadline = (await now()) + 3600n;
      const value = ethers.parseEther("0.1");
      const nonce = await wallet.nonce();
      const signerA = signerByAddress.get(owners[0])!;
      const signerB = signerByAddress.get(owners[1])!;
      const sigA = await signWalletTx(wallet, signerA, recipient.address, value, "0x", nonce, deadline);
      const sigB = await signWalletTx(wallet, signerB, recipient.address, value, "0x", nonce, deadline);

      await expectRevert(wallet.executeSigned(recipient.address, value, "0x", deadline, sigA));
      await expectRevert(wallet.executeSigned(recipient.address, value, "0x", deadline, ethers.concat([sigA, sigA])));

      const wrongNonceSig = await signWalletTx(wallet, signerB, recipient.address, value, "0x", nonce + 1n, deadline);
      await expectRevert(wallet.executeSigned(recipient.address, value, "0x", deadline, ethers.concat([sigA, wrongNonceSig])));

      const wrongChainSig = await signerA.signTypedData(
        { name: "NexoraSafeWallet", version: "1", chainId: 31338, verifyingContract: await wallet.getAddress() },
        walletTypes,
        { to: recipient.address, value, dataHash: ethers.keccak256("0x"), nonce, deadline }
      );
      await expectRevert(wallet.executeSigned(recipient.address, value, "0x", deadline, ethers.concat([wrongChainSig, sigB])));

      await wallet.executeSigned(recipient.address, value, "0x", deadline, ethers.concat([sigA, sigB]));
      await expectRevert(wallet.executeSigned(recipient.address, value, "0x", deadline, ethers.concat([sigA, sigB])));
    });

    it("blocks reentrancy during signed execution", async function () {
      const [owner, entryPoint] = await ethers.getSigners();
      const { wallet } = await deployWallet(owner.address, entryPoint.address);
      const attacker = await ethers.deployContract("ReentrantWithdrawReceiver", [await wallet.getAddress()]);
      await wallet.deposit({ value: ethers.parseEther("1") });
      const deadline = (await now()) + 3600n;

      const withdrawData = wallet.interface.encodeFunctionData("withdraw", [await attacker.getAddress(), ethers.parseEther("0.1")]);
      const reentrantData = wallet.interface.encodeFunctionData("withdraw", [await attacker.getAddress(), 1]);
      const reentrantSignature = await signWalletTx(wallet, owner, await wallet.getAddress(), 0n, reentrantData, 1n, deadline);
      const reentrantCall = wallet.interface.encodeFunctionData("executeSigned", [
        await wallet.getAddress(),
        0,
        reentrantData,
        deadline,
        reentrantSignature
      ]);
      await attacker.setReentrantCall(reentrantCall);
      const signature = await signWalletTx(wallet, owner, await wallet.getAddress(), 0n, withdrawData, 0n, deadline);

      await expectRevert(wallet.executeSigned(await wallet.getAddress(), 0, withdrawData, deadline, signature));
    });

    it("validates ERC4337 user operations from the configured entry point", async function () {
      const [owner, entryPoint] = await ethers.getSigners();
      const { wallet } = await deployWallet(owner.address, entryPoint.address);
      const userOpHash = ethers.keccak256(ethers.toUtf8Bytes("user-op"));
      const signature = await owner.signMessage(ethers.getBytes(userOpHash));
      const userOp = {
        sender: await wallet.getAddress(),
        nonce: await wallet.nonce(),
        initCode: "0x",
        callData: "0x",
        accountGasLimits: ethers.ZeroHash,
        preVerificationGas: 0,
        gasFees: ethers.ZeroHash,
        paymasterAndData: "0x",
        signature
      };

      expect(await wallet.connect(entryPoint).validateUserOp.staticCall({ ...userOp, nonce: 99 }, userOpHash, 0)).to.equal(1n);
      await wallet.connect(entryPoint).validateUserOp(userOp, userOpHash, 0);
      expect(await wallet.nonce()).to.equal(1n);

      await wallet.deposit({ value: 1 });
      const fundedHash = ethers.keccak256(ethers.toUtf8Bytes("funded-user-op"));
      const fundedOp = { ...userOp, nonce: 1n, signature: await owner.signMessage(ethers.getBytes(fundedHash)) };
      await wallet.connect(entryPoint).validateUserOp(fundedOp, fundedHash, 1);
      expect(await wallet.nonce()).to.equal(2n);
      await expectRevert(wallet.validateUserOp(userOp, userOpHash, 0));
    });
  });

  describe("Token and vesting", function () {
    it("mints fixed 1B distribution, supports burn/pause/governance, and rejects extra mint over cap", async function () {
      const signers = await ethers.getSigners();
      const recipients = signers.slice(0, 8).map((signer) => signer.address);
      const token = await ethers.deployContract("NexoraToken", [recipients, signers[8].address, signers[9].address]);

      expect(await token.totalSupply()).to.equal(ethers.parseEther("1000000000"));
      expect(await token.balanceOf(recipients[0])).to.equal(ethers.parseEther("200000000"));

      await token.connect(signers[0]).burn(ethers.parseEther("1"));
      expect(await token.totalSupply()).to.equal(ethers.parseEther("999999999"));
      await expectRevert(token.connect(signers[8]).mint(recipients[0], 1));
      await token.connect(signers[9]).mint(recipients[0], ethers.parseEther("1"));
      await expectRevert(token.connect(signers[9]).mint(recipients[0], 1));
      await expectRevert(token.connect(signers[1]).mint(recipients[1], 1));

      await token.connect(signers[8]).pause();
      await expectRevert(token.connect(signers[0]).transfer(signers[1].address, 1));
      await token.connect(signers[8]).unpause();
      await token.connect(signers[0]).delegate(signers[0].address);
      expect(await token.getVotes(signers[0].address)).to.equal(await token.balanceOf(signers[0].address));
      expect(await token.nonces(signers[0].address)).to.equal(0n);
    });

    it("handles multi-beneficiary vesting release, double claim prevention, revocation, and pause", async function () {
      const [admin, beneficiary, recipient] = await ethers.getSigners();
      const recipients = Array(8).fill(admin.address);
      const token = await ethers.deployContract("NexoraToken", [recipients, admin.address, recipient.address]);
      const vesting = await ethers.deployContract("TokenVesting", [await token.getAddress(), admin.address]);
      const scheduleId = ethers.keccak256(ethers.toUtf8Bytes("team-1"));
      const start = await now();
      const amount = ethers.parseEther("1000");

      await token.transfer(await vesting.getAddress(), amount);
      await vesting.createVestingSchedule(scheduleId, beneficiary.address, amount, start, 30n * 24n * 60n * 60n, 0, true);
      await expectRevert(vesting.release(scheduleId));

      await network.provider.send("evm_increaseTime", [360 * 24 * 60 * 60]);
      await network.provider.send("evm_mine");
      await vesting.release(scheduleId);
      expect((await token.balanceOf(beneficiary.address)) > 0n).to.equal(true);
      await expectRevert(vesting.release.staticCall(scheduleId));

      const revokeId = ethers.keccak256(ethers.toUtf8Bytes("investor-1"));
      await vesting.createVestingSchedule(revokeId, beneficiary.address, ethers.parseEther("100"), start, 0, 1, true);
      await token.transfer(await vesting.getAddress(), ethers.parseEther("100"));
      await vesting.revokeSchedule(revokeId, recipient.address);
      await vesting.createVestingSchedule(ethers.keccak256(ethers.toUtf8Bytes("partner-1")), beneficiary.address, 1, start, 0, 3, false);

      await expectRevert(vesting.createVestingSchedule(revokeId, beneficiary.address, 1, start, 0, 2, false));
      await expectRevert(vesting.createVestingSchedule(ethers.keccak256(ethers.toUtf8Bytes("zero")), beneficiary.address, 0, start, 0, 3, false));

      await vesting.pauseVesting();
      await expectRevert(vesting.release(scheduleId));
      await vesting.resumeVesting();
    });
  });

  describe("Registry and escrow payments", function () {
    async function deployRegistryProcessor() {
      const [admin, timelock, merchant, merchantWallet, feeRecipient] = await ethers.getSigners();
      const registry = await deployProxy("MerchantRegistry", [admin.address, timelock.address]);
      const processor = await deployProxy("PaymentProcessor", [await registry.getAddress(), feeRecipient.address, admin.address, timelock.address]);
      await registry.setMerchant(merchant.address, merchantWallet.address, 250, true, true, 0);
      return { admin, timelock, merchant, merchantWallet, feeRecipient, registry, processor };
    }

    it("escrows ETH, releases on merchant confirmation, and rejects tampered QR signatures", async function () {
      const [, , , , , payer, attacker] = await ethers.getSigners();
      const { merchant, merchantWallet, feeRecipient, processor } = await deployRegistryProcessor();
      const paymentId = ethers.keccak256(ethers.toUtf8Bytes("eth-invoice"));
      const amount = ethers.parseEther("1");
      const signature = await signPayment(processor, merchantWallet, paymentId, merchant.address, ethers.ZeroAddress, amount);
      const tampered = await signPayment(processor, merchantWallet, paymentId, merchant.address, ethers.ZeroAddress, amount + 1n);

      await expectRevert(processor.connect(attacker).escrowPayment(paymentId, merchant.address, ethers.ZeroAddress, amount, tampered, { value: amount }));
      await processor.connect(payer).pay(paymentId, merchant.address, ethers.ZeroAddress, amount, signature, { value: amount });
      await expectRevert(processor.connect(attacker).releasePayment(paymentId));

      const merchantBefore = await ethers.provider.getBalance(merchantWallet.address);
      const feeBefore = await ethers.provider.getBalance(feeRecipient.address);
      await processor.connect(merchant).releasePayment(paymentId);

      expect(await ethers.provider.getBalance(merchantWallet.address)).to.equal(merchantBefore + ethers.parseEther("0.975"));
      expect(await ethers.provider.getBalance(feeRecipient.address)).to.equal(feeBefore + ethers.parseEther("0.025"));
    });

    it("escrows ERC20, supports disputes/refunds, batch settlement, and role checks", async function () {
      const signers = await ethers.getSigners();
      const payer = signers[5];
      const { admin, merchant, merchantWallet, processor } = await deployRegistryProcessor();
      const token = await ethers.deployContract("NexoraToken", [Array(8).fill(admin.address), admin.address, signers[9].address]);
      await token.transfer(payer.address, ethers.parseEther("300"));

      const paymentId = ethers.keccak256(ethers.toUtf8Bytes("token-refund"));
      const amount = ethers.parseEther("100");
      const signature = await signPayment(processor, merchantWallet, paymentId, merchant.address, await token.getAddress(), amount);
      await token.connect(payer).approve(await processor.getAddress(), amount);
      await processor.connect(payer).escrowPayment(paymentId, merchant.address, await token.getAddress(), amount, signature);
      await processor.connect(payer).raiseDispute(paymentId);
      await processor.resolveDispute(paymentId, true);
      expect(await token.balanceOf(payer.address)).to.equal(ethers.parseEther("300"));

      const ids = [ethers.keccak256(ethers.toUtf8Bytes("batch-1")), ethers.keccak256(ethers.toUtf8Bytes("batch-2"))];
      for (const id of ids) {
        const sig = await signPayment(processor, merchantWallet, id, merchant.address, await token.getAddress(), amount);
        await token.connect(payer).approve(await processor.getAddress(), amount);
        await processor.connect(payer).escrowPayment(id, merchant.address, await token.getAddress(), amount, sig);
      }
      await processor.connect(merchant).batchSettlement(ids);
      expect(await token.balanceOf(merchantWallet.address)).to.equal(ethers.parseEther("195"));

      const disputeId = ethers.keccak256(ethers.toUtf8Bytes("merchant-wins-dispute"));
      const disputeSig = await signPayment(processor, merchantWallet, disputeId, merchant.address, await token.getAddress(), amount);
      await token.connect(payer).approve(await processor.getAddress(), amount);
      await processor.connect(payer).escrowPayment(disputeId, merchant.address, await token.getAddress(), amount, disputeSig);
      await processor.connect(merchant).raiseDispute(disputeId);
      await processor.resolveDispute(disputeId, false);

      await processor.pause();
      await expectRevert(processor.connect(payer).escrowPayment(ethers.keccak256(ethers.toUtf8Bytes("paused")), merchant.address, await token.getAddress(), amount, disputeSig));
      await processor.unpause();
    });

    it("requires timelock authority for merchant fee changes", async function () {
      const { admin, timelock, merchant, merchantWallet, registry } = await deployRegistryProcessor();

      await expectRevert(registry.connect(admin).setMerchant(merchant.address, merchantWallet.address, 300, true, true, 0));
      await registry.connect(timelock).setMerchantFee(merchant.address, 300);
      await registry.pause();
      await registry.unpause();

      const [, feeBps] = await registry.settlementFor(merchant.address);
      expect(feeBps).to.equal(300n);
    });

    it("supports relayer-submitted ERC20 payments for gasless UX", async function () {
      const signers = await ethers.getSigners();
      const payer = signers[5];
      const relayer = signers[6];
      const { admin, merchant, merchantWallet, processor } = await deployRegistryProcessor();
      const token = await ethers.deployContract("NexoraToken", [Array(8).fill(admin.address), admin.address, signers[9].address]);
      const amount = ethers.parseEther("10");
      const paymentId = ethers.keccak256(ethers.toUtf8Bytes("gasless-token-payment"));
      const signature = await signPayment(processor, merchantWallet, paymentId, merchant.address, await token.getAddress(), amount);

      await token.transfer(payer.address, amount);
      await token.connect(payer).approve(await processor.getAddress(), amount);
      await processor.authorizeRelayer(relayer.address);
      await expectRevert(processor.connect(relayer).gaslessPay(ethers.keccak256(ethers.toUtf8Bytes("bad-paymaster")), payer.address, merchant.address, await token.getAddress(), amount, signature, "0x1234"));
      await processor.deauthorizeRelayer(relayer.address);
      await expectRevert(processor.connect(relayer).gaslessPay(paymentId, payer.address, merchant.address, await token.getAddress(), amount, signature, "0x"));
      await processor.authorizeRelayer(relayer.address);
      await processor.connect(relayer).gaslessPay(paymentId, payer.address, merchant.address, await token.getAddress(), amount, signature, "0x");
      await processor.connect(merchant).releasePayment(paymentId);

      expect(await token.balanceOf(merchantWallet.address)).to.equal(ethers.parseEther("9.75"));
    });

    it("supports direct refund manager refunds from escrow", async function () {
      const signers = await ethers.getSigners();
      const payer = signers[5];
      const { merchant, merchantWallet, processor } = await deployRegistryProcessor();
      const paymentId = ethers.keccak256(ethers.toUtf8Bytes("direct-refund"));
      const amount = ethers.parseEther("0.5");
      const signature = await signPayment(processor, merchantWallet, paymentId, merchant.address, ethers.ZeroAddress, amount);

      await processor.connect(payer).escrowPayment(paymentId, merchant.address, ethers.ZeroAddress, amount, signature, { value: amount });
      const before = await ethers.provider.getBalance(payer.address);
      await processor.refundPayment(paymentId);
      expect(await ethers.provider.getBalance(payer.address)).to.equal(before + amount);
      await expectRevert(processor.connect(signers[6]).raiseDispute(paymentId));
    });

    it("restricts UUPS upgrades to timelock role", async function () {
      const { processor, timelock } = await deployRegistryProcessor();
      const Implementation = await ethers.getContractFactory("PaymentProcessor");
      const newImplementation = await Implementation.deploy();

      await expectRevert(processor.upgradeToAndCall(await newImplementation.getAddress(), "0x"));
      await processor.connect(timelock).upgradeToAndCall(await newImplementation.getAddress(), "0x");
    });
  });

  describe("Treasury timelock", function () {
    it("distributes rewards immediately and gates withdrawals through 48 hour timelock", async function () {
      const [admin, rewardManager, recipient] = await ethers.getSigners();
      const Timelock = await ethers.getContractFactory("TimelockController");
      const timelock = await Timelock.deploy(48 * 60 * 60, [admin.address], [admin.address], admin.address);
      const treasury = await deployProxy("TokenTreasury", [await timelock.getAddress(), rewardManager.address, admin.address]);
      const token = await ethers.deployContract("NexoraToken", [Array(8).fill(admin.address), admin.address, await timelock.getAddress()]);
      const reward = ethers.parseEther("10");

      await token.transfer(await treasury.getAddress(), reward);
      await treasury.connect(rewardManager).distributeReward(await token.getAddress(), recipient.address, reward);
      expect(await token.balanceOf(recipient.address)).to.equal(reward);

      const tokenData = treasury.interface.encodeFunctionData("withdrawToken", [await token.getAddress(), recipient.address, 1]);
      const tokenSalt = ethers.keccak256(ethers.toUtf8Bytes("withdraw-token"));
      await token.transfer(await treasury.getAddress(), 1);
      await timelock.schedule(await treasury.getAddress(), 0, tokenData, ethers.ZeroHash, tokenSalt, 48 * 60 * 60);
      await network.provider.send("evm_increaseTime", [48 * 60 * 60]);
      await network.provider.send("evm_mine");
      await timelock.execute(await treasury.getAddress(), 0, tokenData, ethers.ZeroHash, tokenSalt);

      await admin.sendTransaction({ to: await treasury.getAddress(), value: ethers.parseEther("1") });
      const data = treasury.interface.encodeFunctionData("withdrawETH", [recipient.address, ethers.parseEther("1")]);
      const salt = ethers.keccak256(ethers.toUtf8Bytes("withdraw-eth"));
      await timelock.schedule(await treasury.getAddress(), 0, data, ethers.ZeroHash, salt, 48 * 60 * 60);
      await expectRevert(timelock.execute(await treasury.getAddress(), 0, data, ethers.ZeroHash, salt));
      await network.provider.send("evm_increaseTime", [48 * 60 * 60]);
      await network.provider.send("evm_mine");

      const before = await ethers.provider.getBalance(recipient.address);
      await timelock.execute(await treasury.getAddress(), 0, data, ethers.ZeroHash, salt);
      expect(await ethers.provider.getBalance(recipient.address)).to.equal(before + ethers.parseEther("1"));
    });
  });

  describe("Paymaster", function () {
    it("sponsors approved wallets and gates withdrawals by timelock", async function () {
      const [admin, timelock, entryPoint, wallet, recipient] = await ethers.getSigners();
      const paymaster = await deployProxy("NexoraPaymaster", [entryPoint.address, admin.address, timelock.address]);
      const userOp = {
        sender: wallet.address,
        nonce: 0,
        initCode: "0x",
        callData: "0x",
        accountGasLimits: ethers.ZeroHash,
        preVerificationGas: 0,
        gasFees: ethers.ZeroHash,
        paymasterAndData: "0x",
        signature: "0x"
      };

      await expectRevert(paymaster.validatePaymasterUserOp.staticCall(userOp, ethers.ZeroHash, 1));
      expect((await paymaster.connect(entryPoint).validatePaymasterUserOp.staticCall(userOp, ethers.ZeroHash, 1))[1]).to.equal(1n);

      await admin.sendTransaction({ to: await paymaster.getAddress(), value: ethers.parseEther("1") });
      await paymaster.setSponsoredAccount(wallet.address, true);
      expect((await paymaster.connect(entryPoint).validatePaymasterUserOp.staticCall(userOp, ethers.ZeroHash, 1))[1]).to.equal(0n);

      await expectRevert(paymaster.connect(admin).withdraw(recipient.address, 1));
      const before = await ethers.provider.getBalance(recipient.address);
      await paymaster.connect(timelock).withdraw(recipient.address, 1);
      expect(await ethers.provider.getBalance(recipient.address)).to.equal(before + 1n);
    });
  });
});
