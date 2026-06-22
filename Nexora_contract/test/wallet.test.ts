import { expect } from "chai";
import { isAddress, Wallet } from "ethers";
import { ethers } from "hardhat";
import { generateWallet } from "../src/wallet";

const PRIVATE_KEY_REGEX = /^0x[0-9a-fA-F]{64}$/;
const PUBLIC_KEY_REGEX = /^0x0[23][0-9a-fA-F]{64}$/;

describe("generateWallet", function () {
  it("generates a valid Ethereum-compatible wallet", function () {
    const wallet = generateWallet();

    expect(isAddress(wallet.address)).to.equal(true);
    expect(wallet.privateKey).to.match(PRIVATE_KEY_REGEX);
    expect(wallet.publicKey).to.match(PUBLIC_KEY_REGEX);
    expect(wallet.mnemonic.trim().split(/\s+/)).to.have.lengthOf(12);
  });

  it("generates credentials that are cryptographically consistent", function () {
    const wallet = generateWallet();
    const restoredWallet = Wallet.fromPhrase(wallet.mnemonic);

    expect(restoredWallet.address).to.equal(wallet.address);
    expect(restoredWallet.privateKey).to.equal(wallet.privateKey);
  });

  it("generates unique credentials across multiple wallets", function () {
    const wallets = Array.from({ length: 20 }, () => generateWallet());

    expect(new Set(wallets.map((wallet) => wallet.address)).size).to.equal(20);
    expect(new Set(wallets.map((wallet) => wallet.privateKey)).size).to.equal(20);
    expect(new Set(wallets.map((wallet) => wallet.mnemonic)).size).to.equal(20);
  });

  it("returns a frozen object", function () {
    const wallet = generateWallet();

    expect(Object.isFrozen(wallet)).to.equal(true);
    expect(() => {
      (wallet as { address: string }).address =
        "0x0000000000000000000000000000000000000000";
    }).to.throw(TypeError);
  });

  it("can be used as the owner of a SafeWallet contract", async function () {
    const wallet = generateWallet();
    const safeWallet = await ethers.deployContract("SafeWallet", [wallet.address]);

    expect(await safeWallet.owner()).to.equal(wallet.address);
  });
});
