import { ethers } from 'hardhat';

async function main() {
  const [admin, timelock] = await ethers.getSigners();
  const Implementation = await ethers.getContractFactory('NexoraTokenSystem');
  const implementation = await Implementation.deploy();
  await implementation.waitForDeployment();
  const initData = Implementation.interface.encodeFunctionData('initialize', [admin.address, timelock.address]);
  const Proxy = await ethers.getContractFactory('NexoraProxy');
  const proxy = await Proxy.deploy(implementation.target, initData);
  await proxy.waitForDeployment();
  const token = await ethers.getContractAt('NexoraTokenSystem', proxy.target);
  const VESTING_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('VESTING_MANAGER_ROLE'));
  const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('PAUSER_ROLE'));
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));
  console.log('admin vesting manager', await token.hasRole(VESTING_MANAGER_ROLE, admin.address));
  console.log('admin pauser', await token.hasRole(PAUSER_ROLE, admin.address));
  console.log('timelock minter', await token.hasRole(MINTER_ROLE, timelock.address));
  await token.connect(timelock).mint(admin.address, ethers.parseEther('1000'));
  console.log('admin balance', (await token.balanceOf(admin.address)).toString());
  await token.connect(admin).pause();
  console.log('pause ok');
  await token.connect(admin).unpause();
  console.log('unpause ok');
  try {
    const scheduleId = ethers.keccak256(ethers.toUtf8Bytes('team-vesting'));
    const start = BigInt(Math.floor(Date.now()/1000));
    await token.connect(admin).createVestingSchedule(scheduleId, admin.address, ethers.parseEther('1000'), start, 0, 0, true);
    console.log('create vesting ok');
  } catch (err:any) {
    console.error('create vesting error', err.error?.message ?? err.message);
    console.error(err.error?.data ?? err.data ?? err);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
