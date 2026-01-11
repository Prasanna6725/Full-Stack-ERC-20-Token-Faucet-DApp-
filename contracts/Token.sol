// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Token
 * @dev ERC-20 token with fixed maximum supply and minting restricted to faucet
 */
contract Token is ERC20, Ownable {
    // Maximum total supply of tokens (100,000 tokens with 18 decimals)
    uint256 public constant MAX_SUPPLY = 100_000 * 10 ** 18;
    
    // Address authorized to mint tokens (the faucet contract)
    address public minter;

    /**
     * @dev Event emitted when minter is changed
     */
    event MinterChanged(address indexed newMinter);

    /**
     * @dev Constructor initializes token with name, symbol, and sets minter
     * @param _minter Address of the faucet contract authorized to mint
     */
    constructor(address _minter) ERC20("TestToken", "TEST") {
        require(_minter != address(0), "Minter cannot be zero address");
        minter = _minter;
    }

    /**
     * @dev Allows owner to change the minter address
     * @param _newMinter Address of the new minter
     */
    function setMinter(address _newMinter) external onlyOwner {
        require(_newMinter != address(0), "Minter cannot be zero address");
        minter = _newMinter;
        emit MinterChanged(_newMinter);
    }

    /**
     * @dev Mints tokens - restricted to minter only
     * @param to Address to receive minted tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external {
        require(msg.sender == minter, "Only minter can mint tokens");
        require(to != address(0), "Cannot mint to zero address");
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds maximum supply");
        
        _mint(to, amount);
    }

    /**
     * @dev Returns the number of decimals used by the token
     * @return Number of decimals (18)
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
