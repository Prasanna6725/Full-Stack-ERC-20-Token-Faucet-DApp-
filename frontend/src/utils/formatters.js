// Utility to format large numbers
export function formatTokenAmount(wei, decimals = 18, displayDecimals = 2) {
  if (!wei || wei === '0') return '0';
  
  const weiStr = wei.toString();
  const divisor = Math.pow(10, decimals);
  const amount = parseFloat(weiStr) / divisor;
  
  return amount.toFixed(displayDecimals);
}

// Utility to format addresses
export function formatAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Utility to format time remaining
export function formatTimeRemaining(cooldownEndTime, currentTime = Math.floor(Date.now() / 1000)) {
  const cooldownEnd = parseInt(cooldownEndTime);
  const now = Math.floor(currentTime);
  
  if (now >= cooldownEnd) {
    return 'Ready';
  }
  
  const remaining = cooldownEnd - now;
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

// Utility to validate Ethereum address
export function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Utility to calculate percentage
export function calculatePercentage(current, total) {
  if (total === 0) return 0;
  return Math.round((BigInt(current) * BigInt(100)) / BigInt(total));
}
