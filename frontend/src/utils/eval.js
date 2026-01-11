import {
  connectWallet,
  hasWallet,
  getConnectedAddress,
} from './wallet';
import {
  requestTokens,
  getBalance,
  canClaim,
  getRemainingAllowance,
  getContractAddresses,
  initProvider,
} from './contracts';

// Initialize the evaluation interface on window
export async function setupEvalInterface() {
  // Make sure provider is initialized
  try {
    await initProvider();
  } catch (err) {
    console.error('Failed to initialize provider:', err);
  }

  window.__EVAL__ = {
    // Connect wallet and return address
    connectWallet: async () => {
      try {
        if (!hasWallet()) {
          throw new Error('Wallet not available');
        }
        const address = await connectWallet();
        if (!address) {
          throw new Error('No address returned from wallet');
        }
        return address;
      } catch (error) {
        throw new Error(`Connect wallet failed: ${error.message}`);
      }
    },

    // Request tokens and return transaction hash
    requestTokens: async () => {
      try {
        const address = getConnectedAddress();
        if (!address) {
          throw new Error('Wallet not connected');
        }
        const txHash = await requestTokens();
        if (!txHash) {
          throw new Error('No transaction hash returned');
        }
        return txHash;
      } catch (error) {
        throw new Error(`Request tokens failed: ${error.message}`);
      }
    },

    // Get balance for address
    getBalance: async (address) => {
      try {
        if (!address) {
          throw new Error('Address parameter required');
        }
        const balance = await getBalance(address);
        return balance;
      } catch (error) {
        throw new Error(`Get balance failed: ${error.message}`);
      }
    },

    // Check if address can claim
    canClaim: async (address) => {
      try {
        if (!address) {
          throw new Error('Address parameter required');
        }
        const eligible = await canClaim(address);
        return eligible;
      } catch (error) {
        throw new Error(`Can claim check failed: ${error.message}`);
      }
    },

    // Get remaining allowance for address
    getRemainingAllowance: async (address) => {
      try {
        if (!address) {
          throw new Error('Address parameter required');
        }
        const allowance = await getRemainingAllowance(address);
        return allowance;
      } catch (error) {
        throw new Error(`Get remaining allowance failed: ${error.message}`);
      }
    },

    // Get contract addresses
    getContractAddresses: () => {
      try {
        const addresses = getContractAddresses();
        if (!addresses.token || !addresses.faucet) {
          throw new Error('Contract addresses not configured');
        }
        return addresses;
      } catch (error) {
        throw new Error(`Get contract addresses failed: ${error.message}`);
      }
    },
  };
}
