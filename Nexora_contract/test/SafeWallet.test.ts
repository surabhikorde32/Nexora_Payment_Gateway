import { expect } from "chai";
import { ethers } from "hardhat";

describe("SafeWallet", function () {
  async function deploySafeWallet() {
    const [owner, user, receiver] = await ethers.getSigners();
    const wallet = await ethers.deployContract("SafeWallet", [owner.address]);

    return { wallet, owner, user, receiver };
  }

  it("accepts explicit deposits and updates balance", async function () {
    const { wallet, user } = await deploySafeWallet();
    const amount = ethers.parseEther("1");

    await expect(wallet.connect(user).deposit({ value: amount }))
      .to.emit(wallet, "Deposit")
      .withArgs(user.address, amount);

    expect(await wallet.getBalance()).to.equal(amount);
  });

  it("reverts zero-value deposits", async function () {
    const { wallet, user } = await deploySafeWallet();

    await expect(wallet.connect(user).deposit({ value: 0n }))
      .to.be.revertedWithCustomError(wallet, "ZeroAmount");
  });

  it("accepts direct ETH transfers through receive()", async function () {
    const { wallet, user } = await deploySafeWallet();
    const amount = ethers.parseEther("0.25");

    await expect(user.sendTransaction({ to: await wallet.getAddress(), value: amount }))
      .to.emit(wallet, "Deposit")
      .withArgs(user.address, amount);

    expect(await wallet.getBalance()).to.equal(amount);
  });

  it("accepts ETH sent through fallback calldata", async function () {
    const { wallet, user } = await deploySafeWallet();
    const amount = ethers.parseEther("0.1");

    await expect(user.sendTransaction({
      to: await wallet.getAddress(),
      value: amount,
      data: "0x12345678",
    }))
      .to.emit(wallet, "Deposit")
      .withArgs(user.address, amount);

    expect(await wallet.getBalance()).to.equal(amount);
  });

  it("allows the owner to withdraw and emits Withdraw", async function () {
    const { wallet, owner, user, receiver } = await deploySafeWallet();
    const amount = ethers.parseEther("1");

    await wallet.connect(user).deposit({ value: amount });

    await expect(wallet.connect(owner).withdraw(receiver.address, amount))
      .to.emit(wallet, "Withdraw")
      .withArgs(receiver.address, amount);

    expect(await wallet.getBalance()).to.equal(0n);
  });

  it("reverts unauthorized withdrawals", async function () {
    const { wallet, user, receiver } = await deploySafeWallet();

    await expect(wallet.connect(user).withdraw(receiver.address, 1n))
      .to.be.revertedWithCustomError(wallet, "Unauthorized");
  });

  it("reverts zero recipient withdrawals", async function () {
    const { wallet, owner } = await deploySafeWallet();

    await expect(wallet.connect(owner).withdraw(ethers.ZeroAddress, 1n))
      .to.be.revertedWithCustomError(wallet, "ZeroAddress");
  });

  it("reverts zero amount withdrawals", async function () {
    const { wallet, owner, receiver } = await deploySafeWallet();

    await expect(wallet.connect(owner).withdraw(receiver.address, 0n))
      .to.be.revertedWithCustomError(wallet, "ZeroAmount");
  });

  it("reverts withdrawals when balance is insufficient", async function () {
    const { wallet, owner, receiver } = await deploySafeWallet();

    await expect(wallet.connect(owner).withdraw(receiver.address, 1n))
      .to.be.revertedWithCustomError(wallet, "InsufficientBalance");
  });

  it("blocks reentrant withdrawals", async function () {
    const amount = ethers.parseEther("1");
    const attacker = await ethers.deployContract("ReentrantOwner", [amount]);
    const wallet = await ethers.getContractAt("SafeWallet", await attacker.wallet());

    await attacker.deposit({ value: amount * 2n });

    await expect(attacker.attack())
      .to.be.revertedWithCustomError(wallet, "EtherTransferFailed");

    expect(await wallet.getBalance()).to.equal(amount * 2n);
  });

  it("enforces pause and unpause behavior", async function () {
    const { wallet, owner, user } = await deploySafeWallet();
    const amount = ethers.parseEther("0.5");

    await expect(wallet.connect(owner).pause())
      .to.emit(wallet, "Paused")
      .withArgs(owner.address)
      .and.to.emit(wallet, "WalletPaused")
      .withArgs(owner.address);

    await expect(wallet.connect(user).deposit({ value: amount }))
      .to.be.revertedWithCustomError(wallet, "EnforcedPause");

    await expect(user.sendTransaction({ to: await wallet.getAddress(), value: amount }))
      .to.be.revertedWithCustomError(wallet, "EnforcedPause");

    await expect(wallet.connect(owner).withdraw(owner.address, 1n))
      .to.be.revertedWithCustomError(wallet, "EnforcedPause");

    await expect(wallet.connect(owner).unpause())
      .to.emit(wallet, "Unpaused")
      .withArgs(owner.address)
      .and.to.emit(wallet, "WalletUnpaused")
      .withArgs(owner.address);

    await wallet.connect(user).deposit({ value: amount });
    expect(await wallet.getBalance()).to.equal(amount);
  });
});
