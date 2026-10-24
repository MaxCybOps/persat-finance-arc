/**
 * Persat Finance — Arc Mainnet Deployment Script
 * Built with Arc Studio — https://studio.arc.io
 *
 * Target: Arc Mainnet (Chain ID 5042)
 * Native Gas & ERC-20: USDC (0x3600000000000000000000000000000000000000)
 * Price Oracle: Chainlink BTC/USD (0xa109B535C70C8Be9995be64Bb6751AcDB27e03De)
 */

const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { arc } = require('viem/chains');

// Load environment variables from .env
function loadEnv() {
  const envPath = path.resolve('.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.trim().match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}
loadEnv();

const ARC_MAINNET_USDC = '0x3600000000000000000000000000000000000000';
const ARC_MAINNET_CHAINLINK_FEED = '0xa109B535C70C8Be9995be64Bb6751AcDB27e03De';

async function main() {
  console.log('====================================================');
  console.log('   PERSAT FINANCE — ARC MAINNET DEPLOYMENT');
  console.log('   Target Network: Arc Mainnet (Chain ID 5042)');
  console.log('   RPC: https://rpc.mainnet.arc.io');
  console.log('====================================================\n');

  const rawKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!rawKey) {
    console.error('ERROR: No private key found.');
    console.error('Please create a .env file containing:');
    console.error('DEPLOYER_PRIVATE_KEY=0x<your_arc_mainnet_private_key>\n');
    process.exit(1);
  }

  const formattedKey = rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`;
  const account = privateKeyToAccount(formattedKey);
  console.log('Deployer Wallet Address:', account.address);

  const publicClient = createPublicClient({ chain: arc, transport: http() });
  const walletClient = createWalletClient({ account, chain: arc, transport: http() });

  const balanceWei = await publicClient.getBalance({ address: account.address });
  const balanceUsdc = Number(balanceWei) / 1e18;
  console.log(`Gas Balance (Native USDC): ${balanceUsdc.toFixed(4)} USDC\n`);

  if (balanceWei === 0n) {
    console.error('ERROR: Deployer wallet has 0 USDC balance on Arc Mainnet.');
    console.error('Please transfer USDC on Arc Mainnet to:', account.address);
    console.error('Arc Mainnet uses native USDC for gas fees.');
    process.exit(1);
  }

  // Load contract artifacts
  const mockErc20Json = JSON.parse(fs.readFileSync('contracts/out/MockERC20.sol/MockERC20.json', 'utf8'));
  const registryJson = JSON.parse(fs.readFileSync('contracts/out/PersatDealRegistry.sol/PersatDealRegistry.json', 'utf8'));
  const vaultJson = JSON.parse(fs.readFileSync('contracts/out/PersatEscrowVault.sol/PersatEscrowVault.json', 'utf8'));

  // ── Step 1: Deploy cirBTC (Circle Wrapped Bitcoin Collateral) ──
  console.log('Step 1: Deploying cirBTC collateral token (8 decimals)...');
  const cirBtcHash = await walletClient.deployContract({
    abi: mockErc20Json.abi,
    bytecode: mockErc20Json.bytecode.object,
    args: ['Circle Wrapped Bitcoin', 'cirBTC', 8],
  });
  console.log('cirBTC deploy tx:', cirBtcHash);
  const cirBtcReceipt = await publicClient.waitForTransactionReceipt({ hash: cirBtcHash });
  const cirBtcAddress = cirBtcReceipt.contractAddress;
  console.log('-> cirBTC deployed at:', cirBtcAddress);
  console.log(`   Explorer: https://explorer.arc.io/address/${cirBtcAddress}\n`);

  // ── Step 2: Deploy PersatDealRegistry ──
  console.log('Step 2: Deploying PersatDealRegistry...');
  const registryHash = await walletClient.deployContract({
    abi: registryJson.abi,
    bytecode: registryJson.bytecode.object,
    args: [
      ARC_MAINNET_USDC, // usdc_
      cirBtcAddress,    // cirBtc_
      account.address,  // feeRecipient_
      25n,              // feeBps_ (0.25%)
      account.address,  // initialOwner
    ],
  });
  console.log('Registry deploy tx:', registryHash);
  const registryReceipt = await publicClient.waitForTransactionReceipt({ hash: registryHash });
  const registryAddress = registryReceipt.contractAddress;
  console.log('-> PersatDealRegistry deployed at:', registryAddress);
  console.log(`   Explorer: https://explorer.arc.io/address/${registryAddress}\n`);

  // ── Step 3: Deploy PersatEscrowVault ──
  console.log('Step 3: Deploying PersatEscrowVault with Chainlink BTC/USD oracle...');
  const vaultHash = await walletClient.deployContract({
    abi: vaultJson.abi,
    bytecode: vaultJson.bytecode.object,
    args: [
      registryAddress,            // registry_
      ARC_MAINNET_USDC,           // usdc_
      cirBtcAddress,              // cirBtc_
      ARC_MAINNET_CHAINLINK_FEED, // priceFeed_
      86400n,                     // stalenessThreshold_ (24h)
      8000n,                      // liquidationThresholdBps_ (80%)
      account.address,            // feeRecipient_
      25n,                        // feeBps_ (0.25%)
      account.address,            // initialOwner
    ],
  });
  console.log('Vault deploy tx:', vaultHash);
  const vaultReceipt = await publicClient.waitForTransactionReceipt({ hash: vaultHash });
  const vaultAddress = vaultReceipt.contractAddress;
  console.log('-> PersatEscrowVault deployed at:', vaultAddress);
  console.log(`   Explorer: https://explorer.arc.io/address/${vaultAddress}\n`);

  // ── Step 4: Wire Vault to Registry (setVault) ──
  console.log('Step 4: Wiring Escrow Vault into Deal Registry (registry.setVault)...');
  const setVaultHash = await walletClient.writeContract({
    address: registryAddress,
    abi: registryJson.abi,
    functionName: 'setVault',
    args: [vaultAddress],
  });
  console.log('setVault tx:', setVaultHash);
  await publicClient.waitForTransactionReceipt({ hash: setVaultHash });
  console.log('-> Protocol wired successfully!\n');

  // ── Step 5: Mint initial cirBTC collateral to deployer ──
  console.log('Step 5: Minting 10 cirBTC collateral to deployer for active loan escrow testing...');
  const mintHash = await walletClient.writeContract({
    address: cirBtcAddress,
    abi: mockErc20Json.abi,
    functionName: 'mint',
    args: [account.address, 10n * 100_000_000n],
  });
  console.log('Mint tx:', mintHash);
  await publicClient.waitForTransactionReceipt({ hash: mintHash });
  console.log('-> Minted 10 cirBTC successfully!\n');

  // ── Step 6: Save Deployed Addresses ──
  const deployedAddresses = {
    network: 'Arc Mainnet',
    chainId: 5042,
    deployedAt: new Date().toISOString(),
    deployer: account.address,
    registry: registryAddress,
    vault: vaultAddress,
    cirBtc: cirBtcAddress,
    usdc: ARC_MAINNET_USDC,
    priceFeed: ARC_MAINNET_CHAINLINK_FEED,
    explorerUrls: {
      registry: `https://explorer.arc.io/address/${registryAddress}`,
      vault: `https://explorer.arc.io/address/${vaultAddress}`,
      cirBtc: `https://explorer.arc.io/address/${cirBtcAddress}`,
      usdc: `https://explorer.arc.io/address/${ARC_MAINNET_USDC}`,
      priceFeed: `https://explorer.arc.io/address/${ARC_MAINNET_CHAINLINK_FEED}`,
    },
  };

  fs.writeFileSync('src/contracts/addresses.mainnet.json', JSON.stringify(deployedAddresses, null, 2), 'utf8');
  console.log('Saved deployment record to src/contracts/addresses.mainnet.json');

  console.log('\n====================================================');
  console.log('   ARC MAINNET DEPLOYMENT COMPLETE!');
  console.log('====================================================');
  console.log('PersatDealRegistry:', registryAddress);
  console.log('PersatEscrowVault :', vaultAddress);
  console.log('cirBTC Collateral :', cirBtcAddress);
  console.log('Chainlink BTC/USD :', ARC_MAINNET_CHAINLINK_FEED);
  console.log('USDC Native Gas   :', ARC_MAINNET_USDC);
  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
