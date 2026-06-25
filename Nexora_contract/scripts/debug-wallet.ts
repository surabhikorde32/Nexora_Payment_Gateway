import { ethers } from 'hardhat';

async function main() {
  const [admin, timelock, entryPoint, owner, recipient] = await ethers.getSigners();
  const Implementation = await ethers.getContractFactory('NexoraWalletSystem');
  const implementation = await Implementation.deploy();
  await implementation.waitForDeployment();
  const initData = Implementation.interface.encodeFunctionData('initialize', [admin.address, timelock.address, entryPoint.address]);
  const Proxy = await ethers.getContractFactory('NexoraProxy');
  const proxy = await Proxy.deploy(implementation.target, initData);
  await proxy.waitForDeployment();
  const factory = await ethers.getContractAt('NexoraWalletSystem', proxy.target);
  const salt = ethers.keccak256(ethers.toUtf8Bytes('wallet-debug'));
  const tx = await factory.deployWallet(owner.address, salt);
  await tx.wait();
  const predicted = await factory.predictWallet(owner.address, salt);
  console.log('predicted', predicted);
  const wallet = await ethers.getContractAt('NexoraSafeWallet', predicted);
  console.log('isOwner', await wallet.isOwner(owner.address));
  console.log('threshold', (await wallet.threshold()).toString());
  await wallet.connect(owner).deposit({ value: ethers.parseEther('1') });
  console.log('deposit done');
  try {
    const tx2 = await wallet.connect(owner).submitTransaction(recipient.address, ethers.parseEther('0.1'), '0x', Math.floor(Date.now()/1000) + 3600);
    await tx2.wait();
    console.log('submit success');
  } catch (err:any) {
    console.error('submit error', err.error?.message ?? err.message);
    console.error(err.error?.data ?? err.data ?? err);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
