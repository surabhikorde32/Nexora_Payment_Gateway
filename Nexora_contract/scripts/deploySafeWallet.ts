import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const owner = process.env.SAFE_WALLET_OWNER ?? deployer.address;

  if (!ethers.isAddress(owner)) {
    throw new Error("SAFE_WALLET_OWNER must be a valid Ethereum address");
  }

  const safeWallet = await ethers.deployContract("SafeWallet", [owner]);
  await safeWallet.waitForDeployment();

  const network = await ethers.provider.getNetwork();
  const safeWalletAddress = await safeWallet.getAddress();

  console.log("SafeWallet deployed");
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId.toString());
  console.log("Deployer:", deployer.address);
  console.log("Owner:", owner);
  console.log("Contract address:", safeWalletAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
