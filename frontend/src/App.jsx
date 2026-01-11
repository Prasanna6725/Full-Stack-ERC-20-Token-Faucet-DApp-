import { useState, useEffect, useCallback } from 'react';
import {
  connectWallet,
  disconnectWallet,
  isWalletConnected,
  getConnectedAddress,
  hasWallet,
  isConnectedToSepolia,
  switchToSepolia,
} from './utils/wallet';
import {
  initProvider,
  getBalance,
  requestTokens,
  canClaim,
  getRemainingAllowance,
  getFaucetPaused,
  getLastClaimTime,
  getFaucetConstants,
  getContractAddresses,
  listenToFaucetClaims,
} from './utils/contracts';
import { setupEvalInterface } from './utils/eval';
import './App.css';

function App() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState(null);
  const [balance, setBalance] = useState('0');
  const [canClaimNow, setCanClaimNow] = useState(false);
  const [remainingAllowance, setRemainingAllowance] = useState('0');
  const [faucetPaused, setFaucetPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastClaimTime, setLastClaimTime] = useState(null);
  const [timeUntilNextClaim, setTimeUntilNextClaim] = useState(null);
  const [faucetConstants, setFaucetConstants] = useState(null);
  const [networkError, setNetworkError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Initialize provider on mount
  useEffect(() => {
    const init = async () => {
      try {
        if (hasWallet()) {
          await initProvider();
          // Setup evaluation interface
          await setupEvalInterface();
        }
      } catch (err) {
        console.error('Failed to initialize provider:', err);
      }
    };
    init();
  }, []);

  // Fetch faucet constants
  useEffect(() => {
    const fetchConstants = async () => {
      try {
        const constants = await getFaucetConstants();
        setFaucetConstants(constants);
      } catch (err) {
        console.error('Failed to fetch faucet constants:', err);
      }
    };
    fetchConstants();
  }, []);

  // Update displayed data
  const updateData = useCallback(async () => {
    if (!connected || !address) return;

    setRefreshing(true);
    try {
      const [bal, canClaimVal, allowance, paused, lastClaim] = await Promise.all([
        getBalance(address),
        canClaim(address),
        getRemainingAllowance(address),
        getFaucetPaused(),
        getLastClaimTime(address),
      ]);

      setBalance(bal);
      setCanClaimNow(canClaimVal);
      setRemainingAllowance(allowance);
      setFaucetPaused(paused);
      setLastClaimTime(lastClaim);
      setError('');
    } catch (err) {
      console.error('Error updating data:', err);
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }, [connected, address]);

  // Handle wallet connection
  const handleConnect = async () => {
    try {
      setError('');
      setNetworkError('');

      if (!hasWallet()) {
        setError('MetaMask or Web3 wallet not detected. Please install it.');
        return;
      }

      // Check if connected to Sepolia
      const isSepolia = await isConnectedToSepolia();
      if (!isSepolia) {
        try {
          await switchToSepolia();
        } catch (switchError) {
          setNetworkError(
            'Please manually switch to Sepolia network in your wallet.'
          );
        }
      }

      const addr = await connectWallet();
      setAddress(addr);
      setConnected(true);
      
      // Update data after connection
      setTimeout(() => updateData(), 500);
    } catch (err) {
      setError(err.message);
      setConnected(false);
      setAddress(null);
    }
  };

  // Handle wallet disconnection
  const handleDisconnect = () => {
    disconnectWallet();
    setConnected(false);
    setAddress(null);
    setBalance('0');
    setCanClaimNow(false);
    setRemainingAllowance('0');
    setError('');
    setSuccess('');
  };

  // Handle token request
  const handleRequestTokens = async () => {
    if (!address || !canClaimNow) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const txHash = await requestTokens();
      setSuccess(`✅ Tokens claimed! Transaction: ${txHash.slice(0, 10)}...`);
      
      // Wait a moment then update data
      setTimeout(() => {
        updateData();
      }, 2000);
    } catch (err) {
      // Parse error message
      let errorMsg = err.message;
      
      if (errorMsg.includes('Must wait 24 hours')) {
        errorMsg = '⏳ Please wait 24 hours before claiming again';
      } else if (errorMsg.includes('Lifetime claim limit')) {
        errorMsg = '⛔ You have reached your lifetime claim limit';
      } else if (errorMsg.includes('paused')) {
        errorMsg = '🔒 Faucet is currently paused';
      } else if (errorMsg.includes('User denied')) {
        errorMsg = '❌ Transaction rejected by user';
      }

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Listen to faucet claims
  useEffect(() => {
    const unsubscribe = listenToFaucetClaims(() => {
      updateData();
    });

    return unsubscribe;
  }, [updateData]);

  // Update claim timer
  useEffect(() => {
    if (!lastClaimTime || lastClaimTime === '0' || !connected) {
      setTimeUntilNextClaim(null);
      return;
    }

    const updateTimer = setInterval(() => {
      const lastClaim = BigInt(lastClaimTime);
      const cooldownTime = faucetConstants
        ? BigInt(faucetConstants.cooldownTime)
        : BigInt(86400);
      
      const nextClaimTime = Number(lastClaim) + Number(cooldownTime);
      const now = Math.floor(Date.now() / 1000);
      const timeRemaining = nextClaimTime - now;

      if (timeRemaining <= 0) {
        setTimeUntilNextClaim(null);
      } else {
        const hours = Math.floor(timeRemaining / 3600);
        const minutes = Math.floor((timeRemaining % 3600) / 60);
        const seconds = timeRemaining % 60;
        setTimeUntilNextClaim(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(updateTimer);
  }, [lastClaimTime, faucetConstants, connected]);

  // Format balance for display
  const formatBalance = (balanceWei) => {
    if (!balanceWei || balanceWei === '0') return '0.00';
    const balanceBig = BigInt(balanceWei);
    const divisor = BigInt(10 ** 16); // 2 decimal places
    const whole = balanceBig / (BigInt(10) ** BigInt(18));
    const decimal = (balanceBig % (BigInt(10) ** BigInt(18))) / divisor;
    return `${whole}.${String(decimal).padStart(2, '0')}`;
  };

  return (
    <div className="container">
      <div className="card">
        <div className="header">
          <h1>🪙 Token Faucet</h1>
          <p className="subtitle">Claim free TEST tokens on Sepolia</p>
        </div>

        {!hasWallet() && (
          <div className="alert alert-warning">
            ⚠️ Please install MetaMask or another Web3 wallet to use this app
          </div>
        )}

        {networkError && (
          <div className="alert alert-warning">{networkError}</div>
        )}

        {error && !loading && (
          <div className="alert alert-error">{error}</div>
        )}

        {success && (
          <div className="alert alert-success">{success}</div>
        )}

        <div className="connection-section">
          {!connected ? (
            <button
              onClick={handleConnect}
              disabled={loading || !hasWallet()}
              className="btn btn-primary"
            >
              {loading ? '⏳ Connecting...' : '🔌 Connect Wallet'}
            </button>
          ) : (
            <>
              <div className="address-display">
                <span className="label">Connected Address:</span>
                <span className="value">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
              </div>
              <button
                onClick={handleDisconnect}
                className="btn btn-secondary"
              >
                Disconnect
              </button>
            </>
          )}
        </div>

        {connected && address && (
          <>
            <div className="stats-grid">
              <div className="stat-box">
                <span className="stat-label">Token Balance</span>
                <span className="stat-value">{formatBalance(balance)} TEST</span>
              </div>

              <div className="stat-box">
                <span className="stat-label">Remaining Allowance</span>
                <span className="stat-value">
                  {formatBalance(remainingAllowance)} TEST
                </span>
              </div>

              {faucetPaused && (
                <div className="stat-box alert-warning">
                  <span className="stat-label">Status</span>
                  <span className="stat-value">🔒 PAUSED</span>
                </div>
              )}

              {timeUntilNextClaim && !canClaimNow && (
                <div className="stat-box">
                  <span className="stat-label">Next Claim In</span>
                  <span className="stat-value">{timeUntilNextClaim}</span>
                </div>
              )}

              {canClaimNow && (
                <div className="stat-box alert-success">
                  <span className="stat-label">Status</span>
                  <span className="stat-value">✅ Ready to Claim</span>
                </div>
              )}
            </div>

            <button
              onClick={handleRequestTokens}
              disabled={!canClaimNow || loading || faucetPaused}
              className="btn btn-primary btn-large"
            >
              {loading ? (
                <>⏳ Processing...</>
              ) : canClaimNow && !faucetPaused ? (
                <>✨ Claim 100 Tokens</>
              ) : faucetPaused ? (
                <>🔒 Faucet Paused</>
              ) : (
                <>⏳ Claim Available Later</>
              )}
            </button>

            {refreshing && (
              <div className="refreshing">
                🔄 Updating data...
              </div>
            )}
          </>
        )}

        <div className="footer">
          <p>Built with React + Ethers.js</p>
          <p style={{ fontSize: '0.85em', marginTop: '0.5em' }}>
            Network: Sepolia Testnet
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
