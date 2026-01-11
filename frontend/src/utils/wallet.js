// Wallet connection utilities
let walletConnected = false;
let connectedAddress = null;

// Check if wallet is available
export function hasWallet() {
  return typeof window !== 'undefined' && !!window.ethereum;
}

// Request wallet connection
export async function connectWallet() {
  if (!hasWallet()) {
    throw new Error('MetaMask or Web3 wallet not detected');
  }

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts returned from wallet');
    }

    connectedAddress = accounts[0];
    walletConnected = true;

    // Set up event listeners
    setupWalletListeners();

    return connectedAddress;
  } catch (error) {
    walletConnected = false;
    connectedAddress = null;
    throw new Error(`Failed to connect wallet: ${error.message}`);
  }
}

// Disconnect wallet
export function disconnectWallet() {
  walletConnected = false;
  connectedAddress = null;
}

// Get connected address
export function getConnectedAddress() {
  return connectedAddress;
}

// Check if wallet is connected
export function isWalletConnected() {
  return walletConnected && connectedAddress !== null;
}

// Set up wallet event listeners
function setupWalletListeners() {
  if (!window.ethereum) return;

  // Listen for account changes
  window.ethereum.on('accountsChanged', (accounts) => {
    if (accounts.length === 0) {
      // User disconnected
      disconnectWallet();
      window.dispatchEvent(new CustomEvent('walletDisconnected'));
    } else {
      // User switched account
      connectedAddress = accounts[0];
      window.dispatchEvent(
        new CustomEvent('accountChanged', {
          detail: { address: connectedAddress },
        })
      );
    }
  });

  // Listen for chain changes
  window.ethereum.on('chainChanged', () => {
    window.dispatchEvent(new CustomEvent('chainChanged'));
  });

  // Listen for disconnect
  window.ethereum.on('disconnect', () => {
    disconnectWallet();
    window.dispatchEvent(new CustomEvent('walletDisconnected'));
  });
}

// Get current network chain ID
export async function getCurrentChainId() {
  if (!window.ethereum) {
    throw new Error('Wallet not available');
  }

  try {
    const chainId = await window.ethereum.request({
      method: 'eth_chainId',
    });
    return chainId;
  } catch (error) {
    throw new Error(`Failed to get chain ID: ${error.message}`);
  }
}

// Check if connected to Sepolia
export async function isConnectedToSepolia() {
  const chainId = await getCurrentChainId();
  // Sepolia chain ID is 0xaa36a7 (11155111 in decimal)
  return chainId === '0xaa36a7' || chainId === 11155111;
}

// Request to switch to Sepolia
export async function switchToSepolia() {
  if (!window.ethereum) {
    throw new Error('Wallet not available');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0xaa36a7' }],
    });
    return true;
  } catch (error) {
    if (error.code === 4902) {
      // Chain not added, try to add it
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0xaa36a7',
              chainName: 'Sepolia',
              rpcUrls: ['https://sepolia.infura.io/v3/'],
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
              nativeCurrency: {
                name: 'Sepolia ETH',
                symbol: 'SEP',
                decimals: 18,
              },
            },
          ],
        });
        return true;
      } catch (addError) {
        throw new Error(`Failed to add Sepolia network: ${addError.message}`);
      }
    }
    throw new Error(`Failed to switch network: ${error.message}`);
  }
}
