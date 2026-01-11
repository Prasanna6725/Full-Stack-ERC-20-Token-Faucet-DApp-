const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting deployment...");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`📝 Deploying contracts with account: ${deployer.address}`);

  // Check account balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${hre.ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    console.error("❌ Insufficient balance for deployment. Please fund your account.");
    process.exit(1);
  }

  // Deploy Token contract
  console.log("\n📦 Deploying Token contract...");
  const TokenFactory = await hre.ethers.getContractFactory("Token");
  
  // Initially deploy with zero address, then update
  let token = await TokenFactory.deploy(hre.ethers.ZeroAddress);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log(`✅ Token deployed to: ${tokenAddress}`);

  // Deploy TokenFaucet contract
  console.log("\n💧 Deploying TokenFaucet contract...");
  const FaucetFactory = await hre.ethers.getContractFactory("TokenFaucet");
  const faucet = await FaucetFactory.deploy(tokenAddress);
  await faucet.waitForDeployment();
  const faucetAddress = await faucet.getAddress();
  console.log(`✅ TokenFaucet deployed to: ${faucetAddress}`);

  // Set minter in Token contract
  console.log("\n🔐 Setting minter in Token contract...");
  const setMinterTx = await token.setMinter(faucetAddress);
  await setMinterTx.wait();
  console.log(`✅ Minter set to faucet: ${faucetAddress}`);

  // Verify contracts
  console.log("\n🔍 Verifying contracts on Etherscan...");
  
  // Wait a bit before verification
  console.log("⏳ Waiting 30 seconds before verification...");
  await new Promise(resolve => setTimeout(resolve, 30000));

  try {
    console.log(`📄 Verifying Token at ${tokenAddress}...`);
    await hre.run("verify:verify", {
      address: tokenAddress,
      constructorArguments: [hre.ethers.ZeroAddress],
    });
    console.log("✅ Token verified");
  } catch (error) {
    console.log("⚠️  Token verification pending or already verified");
  }

  try {
    console.log(`📄 Verifying TokenFaucet at ${faucetAddress}...`);
    await hre.run("verify:verify", {
      address: faucetAddress,
      constructorArguments: [tokenAddress],
    });
    console.log("✅ TokenFaucet verified");
  } catch (error) {
    console.log("⚠️  TokenFaucet verification pending or already verified");
  }

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    tokenAddress,
    faucetAddress,
    deploymentTime: new Date().toISOString(),
    faucetAmount: "100000000000000000000", // 100 tokens in wei
    cooldownTime: "86400", // 24 hours in seconds
    maxClaimAmount: "1000000000000000000000", // 1000 tokens in wei
  };

  const deploymentPath = path.join(__dirname, "../deployment.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n📋 Deployment info saved to: ${deploymentPath}`);

  // Save for frontend use
  const envContent = `VITE_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
VITE_TOKEN_ADDRESS=${tokenAddress}
VITE_FAUCET_ADDRESS=${faucetAddress}
`;

  const envPath = path.join(__dirname, "../.env.local");
  fs.writeFileSync(envPath, envContent);
  console.log(`📝 Environment file saved to: ${envPath}`);

  console.log("\n✨ Deployment completed successfully!");
  console.log("\n📊 Deployment Summary:");
  console.log(`   Network: ${hre.network.name}`);
  console.log(`   Token: ${tokenAddress}`);
  console.log(`   Faucet: ${faucetAddress}`);
  console.log(`   Deployer: ${deployer.address}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
