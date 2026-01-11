import { BrowserProvider, Contract, ZeroAddress } from 'ethers';

// Contract ABIs
const TOKEN_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function totalSupply() external view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

const FAUCET_ABI = [
  'function requestTokens() external',
  'function canClaim(address user) external view returns (bool)',
  'function remainingAllowance(address user) external view returns (uint256)',
  'function isPaused() external view returns (bool)',
  'function lastClaimAt(address user) external view returns (uint256)',
  'function totalClaimed(address user) external view returns (uint256)',
  'function setPaused(bool _paused) external',
  'function admin() external view returns (address)',
  'function token() external view returns (address)',
  'function FAUCET_AMOUNT() external view returns (uint256)',
  'function COOLDOWN_TIME() external view returns (uint256)',
  'function MAX_CLAIM_AMOUNT() external view returns (uint256)',
  'event TokensClaimed(address indexed user, uint256 amount, uint256 timestamp)',
  'event FaucetPaused(bool isPaused)',
];

let provider = null;
let signer = null;
let tokenContract = null;
let faucetContract = null;

// Initialize provider
export async function initProvider() {
  const rpcUrl = import.meta.env.VITE_RPC_URL;
  if (!rpcUrl) {
    throw new Error('VITE_RPC_URL environment variable not set');
  }
  provider = new BrowserProvider(window.ethereum);
  return provider;
}

// Get provider
export function getProvider() {
  if (!provider) {
    throw new Error('Provider not initialized. Call initProvider first.');
  }
  return provider;
}

// Get signer from wallet
export async function getSigner() {
  const provider = getProvider();
  signer = await provider.getSigner();
  return signer;
}

// Get token contract instance
export function getTokenContract() {
  if (!tokenContract) {
    const tokenAddress = import.meta.env.VITE_TOKEN_ADDRESS;
    if (!tokenAddress) {
      throw new Error('VITE_TOKEN_ADDRESS environment variable not set');
    }
    const provider = getProvider();
    tokenContract = new Contract(tokenAddress, TOKEN_ABI, provider);
  }
  return tokenContract;
}

// Get token contract with signer for write operations
export async function getTokenContractWithSigner() {
  const signer = await getSigner();
  const tokenAddress = import.meta.env.VITE_TOKEN_ADDRESS;
  return new Contract(tokenAddress, TOKEN_ABI, signer);
}

// Get faucet contract instance
export function getFaucetContract() {
  if (!faucetContract) {
    const faucetAddress = import.meta.env.VITE_FAUCET_ADDRESS;
    if (!faucetAddress) {
      throw new Error('VITE_FAUCET_ADDRESS environment variable not set');
    }
    const provider = getProvider();
    faucetContract = new Contract(faucetAddress, FAUCET_ABI, provider);
  }
  return faucetContract;
}

// Get faucet contract with signer for write operations
export async function getFaucetContractWithSigner() {
  const signer = await getSigner();
  const faucetAddress = import.meta.env.VITE_FAUCET_ADDRESS;
  return new Contract(faucetAddress, FAUCET_ABI, signer);
}

// Get user's token balance
export async function getBalance(address) {
  if (!address) return '0';
  try {
    const contract = getTokenContract();
    const balance = await contract.balanceOf(address);
    return balance.toString();
  } catch (error) {
    console.error('Error getting balance:', error);
    throw new Error(`Failed to get balance: ${error.message}`);
  }
}

// Request tokens from faucet
export async function requestTokens() {
  try {
    const contract = await getFaucetContractWithSigner();
    const tx = await contract.requestTokens();
    await tx.wait();
    return tx.hash;
  } catch (error) {
    console.error('Error requesting tokens:', error);
    
    // Parse revert reason if available
    if (error.reason) {
      throw new Error(error.reason);
    } else if (error.data?.message) {
      throw new Error(error.data.message);
    }
    throw new Error(`Failed to request tokens: ${error.message}`);
  }
}

// Check if address can claim
export async function canClaim(address) {
  if (!address) return false;
  try {
    const contract = getFaucetContract();
    return await contract.canClaim(address);
  } catch (error) {
    console.error('Error checking claim eligibility:', error);
    throw new Error(`Failed to check claim eligibility: ${error.message}`);
  }
}

// Get remaining allowance for address
export async function getRemainingAllowance(address) {
  if (!address) return '0';
  try {
    const contract = getFaucetContract();
    const allowance = await contract.remainingAllowance(address);
    return allowance.toString();
  } catch (error) {
    console.error('Error getting remaining allowance:', error);
    throw new Error(`Failed to get remaining allowance: ${error.message}`);
  }
}

// Get faucet pause state
export async function getFaucetPaused() {
  try {
    const contract = getFaucetContract();
    return await contract.isPaused();
  } catch (error) {
    console.error('Error getting faucet pause state:', error);
    throw new Error(`Failed to get pause state: ${error.message}`);
  }
}

// Get last claim time for address
export async function getLastClaimTime(address) {
  if (!address) return '0';
  try {
    const contract = getFaucetContract();
    const lastClaim = await contract.lastClaimAt(address);
    return lastClaim.toString();
  } catch (error) {
    console.error('Error getting last claim time:', error);
    throw new Error(`Failed to get last claim time: ${error.message}`);
  }
}

// Get total claimed for address
export async function getTotalClaimed(address) {
  if (!address) return '0';
  try {
    const contract = getFaucetContract();
    const total = await contract.totalClaimed(address);
    return total.toString();
  } catch (error) {
    console.error('Error getting total claimed:', error);
    throw new Error(`Failed to get total claimed: ${error.message}`);
  }
}

// Get faucet constants
export async function getFaucetConstants() {
  try {
    const contract = getFaucetContract();
    const [amount, cooldown, maxClaim] = await Promise.all([
      contract.FAUCET_AMOUNT(),
      contract.COOLDOWN_TIME(),
      contract.MAX_CLAIM_AMOUNT(),
    ]);
    return {
      faucetAmount: amount.toString(),
      cooldownTime: cooldown.toString(),
      maxClaimAmount: maxClaim.toString(),
    };
  } catch (error) {
    console.error('Error getting faucet constants:', error);
    throw new Error(`Failed to get faucet constants: ${error.message}`);
  }
}

// Get contract addresses
export function getContractAddresses() {
  return {
    token: import.meta.env.VITE_TOKEN_ADDRESS || '',
    faucet: import.meta.env.VITE_FAUCET_ADDRESS || '',
  };
}

// Listen to token transfer events
export function listenToTokenTransfers(callback) {
  try {
    const contract = getTokenContract();
    const filter = contract.filters.Transfer();
    
    contract.on(filter, (from, to, value, event) => {
      callback({
        from,
        to,
        value: value.toString(),
        transactionHash: event.transactionHash,
      });
    });

    // Return unsubscribe function
    return () => {
      contract.removeAllListeners(filter);
    };
  } catch (error) {
    console.error('Error setting up transfer listener:', error);
    return () => {};
  }
}

// Listen to faucet claim events
export function listenToFaucetClaims(callback) {
  try {
    const contract = getFaucetContract();
    const filter = contract.filters.TokensClaimed();
    
    contract.on(filter, (user, amount, timestamp, event) => {
      callback({
        user,
        amount: amount.toString(),
        timestamp: timestamp.toString(),
        transactionHash: event.transactionHash,
      });
    });

    // Return unsubscribe function
    return () => {
      contract.removeAllListeners(filter);
    };
  } catch (error) {
    console.error('Error setting up faucet claim listener:', error);
    return () => {};
  }
}
