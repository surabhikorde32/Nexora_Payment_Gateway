import { Wallet } from "ethers";
import type { WalletData } from "./wallet.types";

export function generateWallet(): Readonly<WalletData> {
  const wallet = Wallet.createRandom();

  return Object.freeze({
    address: wallet.address,
    privateKey: wallet.privateKey,
    publicKey: wallet.signingKey.compressedPublicKey,
    mnemonic: wallet.mnemonic?.phrase ?? "",
  });
}
