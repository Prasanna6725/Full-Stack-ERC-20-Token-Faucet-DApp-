// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Token.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title TokenFaucet
 * @dev Token faucet with rate limiting (24-hour cooldown) and lifetime claim limits
 */
contract TokenFaucet is ReentrancyGuard {
    // Token contract reference
    Token public token;
    
    // Amount of tokens distributed per successful claim
    uint256 public constant FAUCET_AMOUNT = 100 * 10 ** 18; // 100 tokens
    
    // Cooldown period between claims (24 hours in seconds)
    uint256 public constant COOLDOWN_TIME = 24 hours;
    
    // Maximum total tokens an address can claim in lifetime
    uint256 public constant MAX_CLAIM_AMOUNT = 1000 * 10 ** 18; // 1000 tokens
    
    // Admin address with pause control
    address public admin;
    
    // Pause state - when true, no claims are allowed
    bool public paused;
    
    // Mapping of address to last claim timestamp
    mapping(address => uint256) public lastClaimAt;
    
    // Mapping of address to total tokens claimed in lifetime
    mapping(address => uint256) public totalClaimed;

    /**
     * @dev Event emitted when tokens are successfully claimed
     */
    event TokensClaimed(address indexed user, uint256 amount, uint256 timestamp);
    
    /**
     * @dev Event emitted when faucet pause state changes
     */
    event FaucetPaused(bool isPaused);

    /**
     * @dev Constructor initializes faucet with token address and sets admin
     * @param _token Address of the token contract
     */
    constructor(address _token) {
        require(_token != address(0), "Token address cannot be zero");
        token = Token(_token);
        admin = msg.sender;
        paused = false;
    }

    /**
     * @dev Allows eligible users to claim tokens
     * Reverts if:
     * - Faucet is paused
     * - User is in cooldown period
     * - User has reached lifetime limit
     * - Faucet has insufficient balance
     */
    function requestTokens() external nonReentrant {
        require(!paused, "Faucet is currently paused");
        require(
            block.timestamp >= lastClaimAt[msg.sender] + COOLDOWN_TIME,
            "Must wait 24 hours between claims"
        );
        require(
            totalClaimed[msg.sender] + FAUCET_AMOUNT <= MAX_CLAIM_AMOUNT,
            "Lifetime claim limit reached"
        );

        // Update state before external call (checks-effects-interactions)
        lastClaimAt[msg.sender] = block.timestamp;
        totalClaimed[msg.sender] += FAUCET_AMOUNT;

        // Mint tokens to user
        token.mint(msg.sender, FAUCET_AMOUNT);

        // Emit event
        emit TokensClaimed(msg.sender, FAUCET_AMOUNT, block.timestamp);
    }

    /**
     * @dev Returns whether an address is currently eligible to claim
     * @param user Address to check
     * @return True if user can claim, false otherwise
     */
    function canClaim(address user) external view returns (bool) {
        // Cannot claim if paused
        if (paused) return false;
        
        // Cannot claim if in cooldown period
        if (block.timestamp < lastClaimAt[user] + COOLDOWN_TIME) return false;
        
        // Cannot claim if lifetime limit reached
        if (totalClaimed[user] >= MAX_CLAIM_AMOUNT) return false;
        
        return true;
    }

    /**
     * @dev Returns remaining lifetime claim allowance for an address
     * @param user Address to check
     * @return Remaining tokens user can claim
     */
    function remainingAllowance(address user) external view returns (uint256) {
        uint256 remaining = MAX_CLAIM_AMOUNT - totalClaimed[user];
        return remaining > 0 ? remaining : 0;
    }

    /**
     * @dev Returns current pause state
     * @return True if faucet is paused, false otherwise
     */
    function isPaused() external view returns (bool) {
        return paused;
    }

    /**
     * @dev Sets pause state - only callable by admin
     * @param _paused New pause state
     */
    function setPaused(bool _paused) external {
        require(msg.sender == admin, "Only admin can pause faucet");
        paused = _paused;
        emit FaucetPaused(_paused);
    }
}
