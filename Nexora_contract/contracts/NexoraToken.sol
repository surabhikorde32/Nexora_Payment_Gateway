// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

contract NexoraToken is ERC20, ERC20Burnable, ERC20Capped, ERC20Pausable, ERC20Permit, ERC20Votes, AccessControl {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 public constant MAX_SUPPLY = 1_000_000_000 ether;
    uint256 public constant TEAM_ALLOCATION = 200_000_000 ether;
    uint256 public constant INVESTOR_ALLOCATION = 150_000_000 ether;
    uint256 public constant TREASURY_ALLOCATION = 200_000_000 ether;
    uint256 public constant STAKING_REWARDS_ALLOCATION = 150_000_000 ether;
    uint256 public constant LIQUIDITY_ALLOCATION = 100_000_000 ether;
    uint256 public constant MERCHANT_REWARDS_ALLOCATION = 100_000_000 ether;
    uint256 public constant ADVISORS_ALLOCATION = 50_000_000 ether;
    uint256 public constant RESERVE_ALLOCATION = 50_000_000 ether;

    error ZeroAddress();
    error ZeroAmount();

    constructor(address[8] memory recipients, address admin, address timelock)
        ERC20("Nexora", "NXR")
        ERC20Capped(MAX_SUPPLY)
        ERC20Permit("Nexora")
    {
        if (admin == address(0) || timelock == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(MINTER_ROLE, timelock);
        _mintAllocation(recipients[0], TEAM_ALLOCATION);
        _mintAllocation(recipients[1], INVESTOR_ALLOCATION);
        _mintAllocation(recipients[2], TREASURY_ALLOCATION);
        _mintAllocation(recipients[3], STAKING_REWARDS_ALLOCATION);
        _mintAllocation(recipients[4], LIQUIDITY_ALLOCATION);
        _mintAllocation(recipients[5], MERCHANT_REWARDS_ALLOCATION);
        _mintAllocation(recipients[6], ADVISORS_ALLOCATION);
        _mintAllocation(recipients[7], RESERVE_ALLOCATION);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        _mint(to, amount);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _mintAllocation(address to, uint256 amount) private {
        if (to == address(0)) revert ZeroAddress();
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Capped, ERC20Pausable, ERC20Votes)
    {
        super._update(from, to, value);
    }

    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
