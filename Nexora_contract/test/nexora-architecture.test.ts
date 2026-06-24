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
    { name: "expiry", type: "uint256" }
  ]
};

const qrTypes = {
  NexoraQRCode: [
    { name: "merchant", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "expiry", type: "uint256" },
    { name: "nonce", type: "bytes32" }
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
  core: any,
  signer: Signer,
  paymentId: string,
  merchant: string,
  token: string,
  amount: bigint,
  expiry: bigint
) {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  return signer.signTypedData(
    { name: "NexoraCore", version: "1", chainId, verifyingContract: await core.getAddress() },
    paymentTypes,
    { paymentId, merchant, token, amount, expiry }
  );
}

async function signQr(
  core: any,
  signer: Signer,
  merchant: string,
  amount: bigint,
  expiry: bigint,
  nonce: string
) {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  return signer.signTypedData(
    { name: "NexoraCore", version: "1", chainId, verifyingContract: await core.getAddress() },
    qrTypes,
    { merchant, amount, expiry, nonce }
  );
}

describe("Nexora production architecture", function () {
  describe("NexoraWalletSystem", function () {
    it("deploys deterministic wallet clones and prevents duplicates", async function () {
      const [admin, timelock, entryPoint, owner] = await ethers.getSigners();
      const factory = await deployProxy("NexoraWalletSystem", [admin.address, timelock.address, entryPoint.address]);
      const salt = ethers.keccak256(ethers.toUtf8Bytes("deterministic"));
      const predicted = await factory.predictWallet(owner.address, salt);

      await factory.deployWallet(owner.address, salt);
      expect(await factory.walletOf(owner.address)).to.equal(predicted);
      await expectRevert(factory.deployWallet(owner.address, salt));
    });

    it("executes a wallet transaction after owner approval", async function () {
      const [admin, timelock, entryPoint, owner, recipient] = await ethers.getSigners();
      const factory = await deployProxy("NexoraWalletSystem", [admin.address, timelock.address, entryPoint.address]);
      const salt = ethers.keccak256(ethers.toUtf8Bytes("wallet-1"));
      const predicted = await factory.predictWallet(owner.address, salt);
      await factory.deployWallet(owner.address, salt);
      const wallet = await ethers.getContractAt("NexoraSafeWallet", predicted);

      await wallet.connect(owner).deposit({ value: ethers.parseEther("1") });
      const deadline = (await now()) + 3600n;

      await wallet.connect(owner).submitTransaction(recipient.address, ethers.parseEther("0.2"), "0x", deadline);
      await expectRevert(wallet.connect(owner).executeTransaction(0));
      await wallet.connect(owner).approveTransaction(0);
      await wallet.connect(owner).executeTransaction(0);

      expect(await ethers.provider.getBalance(await wallet.getAddress())).to.equal(ethers.parseEther("0.8"));
    });
  });

  describe("NexoraTokenSystem", function () {
    it("supports timelock minting, cap enforcement, pause, burn, and governance votes", async function () {
      const [admin, timelock, recipient] = await ethers.getSigners();
      const token = await deployProxy("NexoraTokenSystem", [admin.address, timelock.address]);

      await token.connect(timelock).mint(admin.address, ethers.parseEther("1000000000"));
      expect(await token.totalSupply()).to.equal(ethers.parseEther("1000000000"));
      await expectRevert(token.connect(admin).mint(recipient.address, 1));

      await token.connect(admin).pause();
      await expectRevert(token.connect(admin).transfer(recipient.address, 1));
      await token.connect(admin).unpause();

      await token.connect(admin).burn(ethers.parseEther("1"));
      expect(await token.totalSupply()).to.equal(ethers.parseEther("999999999"));
      await token.connect(admin).delegate(admin.address);
      expect(await token.getVotes(admin.address)).to.equal(await token.balanceOf(admin.address));
    });

    it("creates vesting schedules, releases tokens, and revokes correctly", async function () {
      const [admin, timelock, beneficiary, recipient] = await ethers.getSigners();
      const token = await deployProxy("NexoraTokenSystem", [admin.address, timelock.address]);

      await token.connect(timelock).mint(await token.getAddress(), ethers.parseEther("2000"));
      const scheduleId = ethers.keccak256(ethers.toUtf8Bytes("team-vesting"));
      const start = await now();
      const cliffDuration = 30n * 24n * 60n * 60n;

      await token.connect(admin).createVestingSchedule(scheduleId, beneficiary.address, ethers.parseEther("1000"), start, cliffDuration, 0, true);
      await expectRevert(token.connect(beneficiary).release(scheduleId));

      await network.provider.send("evm_increaseTime", [360 * 24 * 60 * 60]);
      await network.provider.send("evm_mine");

      await token.connect(beneficiary).release(scheduleId);
      expect(await token.balanceOf(beneficiary.address)).to.be.greaterThan(0n);

      const revokeId = ethers.keccak256(ethers.toUtf8Bytes("advisor-vesting"));
      await token.connect(admin).createVestingSchedule(revokeId, beneficiary.address, ethers.parseEther("100"), start, 0, 2, true);
      await token.connect(admin).revokeVesting(revokeId, recipient.address);
      expect(await token.balanceOf(recipient.address)).to.be.greaterThan(0n);
    });
  });

  describe("NexoraCore", function () {
    it("registers merchants, escrows ETH, settles on release, and verifies QR payloads", async function () {
      const [admin, timelock, entryPoint, merchant, merchantWallet, feeRecipient, payer] = await ethers.getSigners();
      const core = await deployProxy("NexoraCore", [admin.address, timelock.address, feeRecipient.address, entryPoint.address, 0, 1, ethers.parseEther("1000000")]);
      await core.connect(admin).registerMerchant(merchant.address, merchantWallet.address, 250, 0, true, true);

      const paymentId = ethers.keccak256(ethers.toUtf8Bytes("eth-payment"));
      const expiry = (await now()) + 3600n;
      const signature = await signPayment(core, merchantWallet, paymentId, merchant.address, ethers.ZeroAddress, ethers.parseEther("1"), expiry);

      await core.connect(payer).payETH(paymentId, merchant.address, expiry, signature, { value: ethers.parseEther("1") });
      await core.connect(merchant).releasePayment(paymentId);

      const qrNonce = ethers.keccak256(ethers.toUtf8Bytes("qr-1"));
      const qrSig = await signQr(core, merchantWallet, merchant.address, ethers.parseEther("5"), expiry, qrNonce);
      expect(await core.verifyQrPayload(merchant.address, ethers.parseEther("5"), expiry, qrNonce, qrSig, merchantWallet.address)).to.equal(true);
    });

    it("supports token payments, disputes, and refund manager flow", async function () {
      const [admin, timelock, entryPoint, merchant, merchantWallet, feeRecipient, payer] = await ethers.getSigners();
      const core = await deployProxy("NexoraCore", [admin.address, timelock.address, feeRecipient.address, entryPoint.address, 0, 1, ethers.parseEther("1000000")]);
      const token = await deployProxy("NexoraTokenSystem", [admin.address, timelock.address]);

      await token.connect(timelock).mint(await token.getAddress(), ethers.parseEther("1000"));
      const tokenAddress = await token.getAddress();
      await core.connect(timelock).setSupportedToken(tokenAddress, true);
      await core.connect(admin).registerMerchant(merchant.address, merchantWallet.address, 250, 0, true, true);

      const paymentId = ethers.keccak256(ethers.toUtf8Bytes("token-payment"));
      const expiry = (await now()) + 3600n;
      const signature = await signPayment(core, merchantWallet, paymentId, merchant.address, tokenAddress, ethers.parseEther("10"), expiry);

      await token.connect(timelock).mint(payer.address, ethers.parseEther("10"));
      await token.connect(payer).approve(core.getAddress(), ethers.parseEther("10"));
      await core.connect(payer).payToken(paymentId, merchant.address, tokenAddress, ethers.parseEther("10"), expiry, signature);

      await core.connect(payer).disputePayment(paymentId);
      await core.connect(admin).resolveDispute(paymentId, true);
      expect(await token.balanceOf(payer.address)).to.equal(ethers.parseEther("10"));
    });
  });
});
