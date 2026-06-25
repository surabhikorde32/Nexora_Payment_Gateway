# Nexora Contract Workflow

This folder contains the final Nexora contract system used by frontend and backend teams.

## Purpose
- `NexoraCore` handles payment escrow, merchant registry, dispute flow, settlement, and paymaster validation.
- `NexoraTokenSystem` handles ERC20 token supply, vesting, pausing, burning, governance, and upgradeability.
- `NexoraWalletSystem` handles wallet clone deployment, Safe-style multisig wallets, and account validation.
- `NexoraProxy` is the ERC1967 proxy wrapper used for upgradeable deployment.

## Sepolia deployment
Use these proxy addresses on Sepolia:

- `NexoraCore` proxy: `0x0a3dafb24d0824038BdEDBEAa95c7B16b326e9BE`
- `NexoraTokenSystem` proxy: `0x260b362F6C7e6DD597331C46A7Ff22788cfCe803`
- `NexoraWalletSystem` proxy: `0x03062900e27478c81Cd9FCb66FB53EC4AdD5b143`

## How to use

### Frontend
1. Use a Sepolia provider URL and the deployed proxy addresses.
2. Load the ABI from the artifact JSON files.
3. Instantiate contracts with the proxy addresses and implementation ABI.


### Backend
1. Use the same Sepolia provider and proxy addresses.
2. Import the ABI files from the contract artifacts.
3. Instantiate `ethers.Contract` objects with a signer for transactions or a provider for read-only calls.


### ABI sources
Use the ABI from these files:
- `artifacts/contracts/NexoraCore.sol/NexoraCore.json`
- `artifacts/contracts/NexoraTokenSystem.sol/NexoraTokenSystem.json`
- `artifacts/contracts/NexoraWalletSystem.sol/NexoraWalletSystem.json`

> Note: The proxy addresses are used as the contract addresses. The implementation ABI is correct for interacting through the proxy.

