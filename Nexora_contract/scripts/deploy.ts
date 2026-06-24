import { ethers } from 'hardhat';

async function main() {
  const signers = await ethers.getSigners();
  const admin = signers[0];
  const timelock = signers[1] ?? admin;
  const walletEntryPoint = signers[2] ?? admin;
  const paymasterEntryPoint = signers[3] ?? admin;
  const feeRecipient = signers[4] ?? admin;

  console.log('Admin:', admin.address);
  console.log('Timelock:', timelock.address);
  console.log('Wallet entry point:', walletEntryPoint.address);
  console.log('Paymaster entry point:', paymasterEntryPoint.address);
  console.log('Fee recipient:', feeRecipient.address);
  console.log('Signer count:', signers.length);

  const Proxy = await ethers.getContractFactory('NexoraProxy');

  // Deploy NexoraCore implementation and proxy
  const CoreImpl = await ethers.getContractFactory('NexoraCore');
  const coreImplementation = await CoreImpl.deploy();
  await coreImplementation.waitForDeployment();
  const coreInitData = CoreImpl.interface.encodeFunctionData('initialize', [
    admin.address,
    timelock.address,
    feeRecipient.address,
    paymasterEntryPoint.address,
    60,
    3600,
    ethers.parseEther('1000')
  ]);
  const coreProxy = await Proxy.deploy(coreImplementation.target, coreInitData);
  await coreProxy.waitForDeployment();
  console.log('NexoraCore proxy deployed at', coreProxy.target);

  // Deploy NexoraTokenSystem implementation and proxy
  const TokenImpl = await ethers.getContractFactory('NexoraTokenSystem');
  const tokenImplementation = await TokenImpl.deploy();
  await tokenImplementation.waitForDeployment();
  const tokenInitData = TokenImpl.interface.encodeFunctionData('initialize', [admin.address, timelock.address]);
  const tokenProxy = await Proxy.deploy(tokenImplementation.target, tokenInitData);
  await tokenProxy.waitForDeployment();
  console.log('NexoraTokenSystem proxy deployed at', tokenProxy.target);

  // Deploy NexoraWalletSystem implementation and proxy
  const WalletImpl = await ethers.getContractFactory('NexoraWalletSystem');
  const walletImplementation = await WalletImpl.deploy();
  await walletImplementation.waitForDeployment();
  const walletInitData = WalletImpl.interface.encodeFunctionData('initialize', [
    admin.address,
    timelock.address,
    walletEntryPoint.address
  ]);
  const walletProxy = await Proxy.deploy(walletImplementation.target, walletInitData);
  await walletProxy.waitForDeployment();
  console.log('NexoraWalletSystem proxy deployed at', walletProxy.target);

  console.log('Deployment complete. Use the returned proxy addresses to interact with the upgradeable contracts.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
