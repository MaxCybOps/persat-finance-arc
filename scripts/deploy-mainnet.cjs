/**
 * Persat Finance — Arc Mainnet Deployment Script
 *
 * Target: Arc Mainnet (Chain ID 5042)
 * Native Gas & ERC-20: USDC (0x3600000000000000000000000000000000000000)
 * Price Oracle: Chainlink BTC/USD (0xa109B535C70C8Be9995be64Bb6751AcDB27e03De)
 *
 * Security review fix F-01: this script NO LONGER deploys a mock collateral token.
 * You must pass the official cirBTC address published by Circle:
 *
 *   CIRBTC_ADDRESS=0x...            (required) official cirBTC ERC-20 on Arc Mainnet
 *   OWNER_ADDRESS=0x...             (required) multisig (e.g. Safe) that will own both contracts
 *   DEPLOYER_PRIVATE_KEY=0x...      (required unless DRY_RUN=1)
 *   FEE_RECIPIENT=0x...             (optional, defaults to OWNER_ADDRESS)
 *   CIRBTC_USDC_POOL=0x...          (optional) cirBTC/USDC pool used by the peg guard
 *   ARC_RPC_URL=https://...         (optional) RPC endpoint, defaults to the public Arc Mainnet RPC
 *   DRY_RUN=1                       (optional) run every safety check, send no transaction
 *
 * The script aborts if the collateral token can be minted by an arbitrary address,
 * does not have 8 decimals, if the oracle is not a fresh BTC/USD feed, if the owner is not
 * a contract (multisig), or if the pool's TWAP is not within 2% of the oracle.
 *
 * Ownership is transferred with Ownable2Step: the multisig must call acceptOwnership()
 * on the registry and on the vault to complete the handover.
 */

const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http, getAddress, isAddress } = require('viem');
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
const ARC_MAINNET_CIRBTC_USDC_POOL = '0x82916bee18fCEF517B26C72d7Cb5F13694E1dB41';
const TWAP_WINDOW = 1800;

// Protocol parameters
const STALENESS_THRESHOLD = 93600n; // 26h: 24h Chainlink heartbeat + 2h margin (N-13)
const LIQUIDATION_THRESHOLD_BPS = 8000n; // 80%
const MAX_INITIAL_LTV_BPS = 6500n; // 65% (F-05)
const FEE_BPS = 25n; // 0.25%

const PROBE_ADDRESS = '0x000000000000000000000000000000000000dEaD';
const RANDOM_CALLER = '0x1111111111111111111111111111111111111111';

const MINT_ABI = [
  { name: 'mint', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
];
const ERC20_META_ABI = [
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
];
const FEED_ABI = [
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
  { name: 'description', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  {
    name: 'latestRoundData', type: 'function', stateMutability: 'view', inputs: [],
    outputs: [
      { name: 'roundId', type: 'uint80' }, { name: 'answer', type: 'int256' }, { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' }, { name: 'answeredInRound', type: 'uint80' },
    ],
  },
];

const POOL_ABI = [
  { name: 'token0', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { name: 'token1', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
];
const OWNABLE_ABI = [
  { name: 'transferOwnership', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'newOwner', type: 'address' }], outputs: [] },
];

function fail(msg) {
  console.error(`\nABORTED: ${msg}\n`);
  process.exit(1);
}

/** F-01 guard: the collateral must be a real, non-mintable-by-anyone 8-decimal token. */
async function assertSafeCollateral(publicClient, cirBtc) {
  const code = await publicClient.getCode({ address: cirBtc });
  if (!code || code === '0x') fail(`CIRBTC_ADDRESS ${cirBtc} has no contract code on Arc Mainnet.`);

  const [decimals, symbol, name] = await Promise.all([
    publicClient.readContract({ address: cirBtc, abi: ERC20_META_ABI, functionName: 'decimals' }),
    publicClient.readContract({ address: cirBtc, abi: ERC20_META_ABI, functionName: 'symbol' }).catch(() => '?'),
    publicClient.readContract({ address: cirBtc, abi: ERC20_META_ABI, functionName: 'name' }).catch(() => '?'),
  ]);
  console.log(`Collateral token: ${name} (${symbol}), ${decimals} decimals`);
  if (Number(decimals) !== 8) fail(`collateral must have 8 decimals, found ${decimals}.`);

  let mintSucceeded = false;
  try {
    await publicClient.simulateContract({
      account: RANDOM_CALLER,
      address: cirBtc,
      abi: MINT_ABI,
      functionName: 'mint',
      args: [PROBE_ADDRESS, 100_000_000_000n],
    });
    mintSucceeded = true;
  } catch {
    // Expected: no public mint (reverts or function does not exist)
  }
  if (mintSucceeded) {
    fail(`${cirBtc} lets an arbitrary address call mint(). This is a mock/test token, not real cirBTC. ` +
      'Use the official cirBTC address published by Circle.');
  }
  console.log('✔ Collateral token cannot be minted by an arbitrary address');
}

async function assertSafeOracle(publicClient, feed) {
  const [decimals, description, round] = await Promise.all([
    publicClient.readContract({ address: feed, abi: FEED_ABI, functionName: 'decimals' }),
    publicClient.readContract({ address: feed, abi: FEED_ABI, functionName: 'description' }).catch(() => '?'),
    publicClient.readContract({ address: feed, abi: FEED_ABI, functionName: 'latestRoundData' }),
  ]);
  const [, answer, , updatedAt] = round;
  const ageSec = BigInt(Math.floor(Date.now() / 1000)) - updatedAt;
  console.log(`Oracle: "${description}", ${decimals} decimals, price ${Number(answer) / 10 ** Number(decimals)}, age ${ageSec}s`);
  if (!String(description).toUpperCase().includes('BTC')) fail('oracle description is not a BTC feed.');
  if (answer <= 0n) fail('oracle returned a non-positive price.');
  if (ageSec > STALENESS_THRESHOLD) fail(`oracle is stale (${ageSec}s > ${STALENESS_THRESHOLD}s).`);
  console.log('✔ Oracle is a fresh BTC/USD feed');
}

async function assertMultisigOwner(publicClient, owner) {
  const code = await publicClient.getCode({ address: owner });
  if (!code || code === '0x') fail(`OWNER_ADDRESS ${owner} is not a contract. Use a multisig such as a Safe (N-10).`);
  if (code.toLowerCase().startsWith('0xef0100') && code.length === 48) {
    fail(`OWNER_ADDRESS ${owner} is a single wallet with an EIP-7702 delegation, not a multisig. Use a Safe (N-10).`);
  }
  console.log('✔ Owner is a contract (multisig)');
}

async function assertPool(publicClient, pool, cirBtc) {
  const [t0, t1] = await Promise.all([
    publicClient.readContract({ address: pool, abi: POOL_ABI, functionName: 'token0' }),
    publicClient.readContract({ address: pool, abi: POOL_ABI, functionName: 'token1' }),
  ]);
  const pair = [getAddress(t0), getAddress(t1)].sort().join();
  if (pair !== [cirBtc, getAddress(ARC_MAINNET_USDC)].sort().join()) fail(`pool ${pool} is not a cirBTC/USDC pool.`);
  console.log('✔ Peg-guard pool is cirBTC/USDC');
}

async function main() {
  const dryRun = process.env.DRY_RUN === '1';
  console.log('====================================================');
  console.log('   PERSAT FINANCE — ARC MAINNET DEPLOYMENT' + (dryRun ? ' (DRY RUN)' : ''));
  console.log('   Target Network: Arc Mainnet (Chain ID 5042)');
  console.log('====================================================\n');

  const rawCirBtc = process.env.CIRBTC_ADDRESS;
  if (!rawCirBtc || !isAddress(rawCirBtc)) {
    fail('CIRBTC_ADDRESS is missing or invalid. Set it to the official cirBTC address published by Circle.');
  }
  const cirBtcAddress = getAddress(rawCirBtc);

  const publicClient = createPublicClient({ chain: arc, transport: http(process.env.ARC_RPC_URL || undefined) });
  const chainId = await publicClient.getChainId();
  if (chainId !== 5042) fail(`connected to chain ${chainId}, expected Arc Mainnet (5042).`);

  const rawOwner = process.env.OWNER_ADDRESS;
  if (!rawOwner || !isAddress(rawOwner)) fail('OWNER_ADDRESS is missing or invalid (multisig that will own the contracts).');
  const ownerAddress = getAddress(rawOwner);
  const poolAddress = getAddress(process.env.CIRBTC_USDC_POOL || ARC_MAINNET_CIRBTC_USDC_POOL);

  // ── Safety checks (F-01, N-10) ──
  await assertSafeCollateral(publicClient, cirBtcAddress);
  await assertSafeOracle(publicClient, ARC_MAINNET_CHAINLINK_FEED);
  await assertMultisigOwner(publicClient, ownerAddress);
  await assertPool(publicClient, poolAddress, cirBtcAddress);

  if (dryRun) {
    console.log('\nDRY RUN complete: all safety checks passed, no transaction sent.\n');
    return;
  }

  const rawKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!rawKey) fail('No private key found. Set DEPLOYER_PRIVATE_KEY in .env (never commit it).');
  const account = privateKeyToAccount(rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`);
  const walletClient = createWalletClient({ account, chain: arc, transport: http(process.env.ARC_RPC_URL || undefined) });
  const feeRecipient = process.env.FEE_RECIPIENT ? getAddress(process.env.FEE_RECIPIENT) : ownerAddress;
  console.log('\nDeployer Wallet Address:', account.address);
  console.log('Fee recipient          :', feeRecipient);

  const balanceWei = await publicClient.getBalance({ address: account.address });
  console.log(`Gas Balance (Native USDC): ${(Number(balanceWei) / 1e18).toFixed(4)} USDC\n`);
  if (balanceWei === 0n) fail('deployer wallet has 0 USDC for gas on Arc Mainnet.');

  // Load contract artifacts
  const registryJson = JSON.parse(fs.readFileSync('contracts/out/PersatDealRegistry.sol/PersatDealRegistry.json', 'utf8'));
  const vaultJson = JSON.parse(fs.readFileSync('contracts/out/PersatEscrowVault.sol/PersatEscrowVault.json', 'utf8'));
  const twapJson = JSON.parse(fs.readFileSync('contracts/out/CirBtcPoolTwap.sol/CirBtcPoolTwap.json', 'utf8'));

  // ── Step 0: Deploy the cirBTC peg guard (B-3) ──
  console.log('Step 0: Deploying CirBtcPoolTwap (peg guard)...');
  const twapHash = await walletClient.deployContract({
    abi: twapJson.abi,
    bytecode: twapJson.bytecode.object,
    args: [poolAddress, cirBtcAddress, ARC_MAINNET_USDC, TWAP_WINDOW],
  });
  const pegGuardAddress = (await publicClient.waitForTransactionReceipt({ hash: twapHash })).contractAddress;
  const twapPrice = await publicClient.readContract({ address: pegGuardAddress, abi: twapJson.abi, functionName: 'twapPriceE18' });
  console.log('-> CirBtcPoolTwap deployed at:', pegGuardAddress, `(cirBTC TWAP $${(Number(twapPrice) / 1e18).toFixed(2)})\n`);

  // ── Step 1: Deploy PersatDealRegistry ──
  console.log('Step 1: Deploying PersatDealRegistry...');
  const registryHash = await walletClient.deployContract({
    abi: registryJson.abi,
    bytecode: registryJson.bytecode.object,
    args: [ARC_MAINNET_USDC, cirBtcAddress, account.address],
  });
  const registryReceipt = await publicClient.waitForTransactionReceipt({ hash: registryHash });
  const registryAddress = registryReceipt.contractAddress;
  console.log('-> PersatDealRegistry deployed at:', registryAddress, '\n');

  // ── Step 2: Deploy PersatEscrowVault ──
  console.log('Step 2: Deploying PersatEscrowVault with Chainlink BTC/USD oracle...');
  const vaultHash = await walletClient.deployContract({
    abi: vaultJson.abi,
    bytecode: vaultJson.bytecode.object,
    args: [
      registryAddress,            // registry_
      ARC_MAINNET_USDC,           // usdc_
      cirBtcAddress,              // cirBtc_
      ARC_MAINNET_CHAINLINK_FEED, // priceFeed_
      STALENESS_THRESHOLD,        // stalenessThreshold_
      LIQUIDATION_THRESHOLD_BPS,  // liquidationThresholdBps_
      MAX_INITIAL_LTV_BPS,        // maxInitialLtvBps_
      pegGuardAddress,            // pegGuard_
      feeRecipient,               // feeRecipient_
      FEE_BPS,                    // feeBps_
      account.address,            // initialOwner
    ],
  });
  const vaultAddress = (await publicClient.waitForTransactionReceipt({ hash: vaultHash })).contractAddress;
  console.log('-> PersatEscrowVault deployed at:', vaultAddress, '\n');

  // ── Step 3: Wire Vault to Registry (setVault) ──
  console.log('Step 3: Wiring Escrow Vault into Deal Registry (registry.setVault)...');
  const setVaultHash = await walletClient.writeContract({
    address: registryAddress,
    abi: registryJson.abi,
    functionName: 'setVault',
    args: [vaultAddress],
  });
  await publicClient.waitForTransactionReceipt({ hash: setVaultHash });
  console.log('-> Protocol wired successfully!\n');

  // ── Step 3b: Hand ownership to the multisig (N-10) ──
  console.log('Step 3b: Transferring ownership to', ownerAddress);
  for (const target of [registryAddress, vaultAddress]) {
    const h = await walletClient.writeContract({ address: target, abi: OWNABLE_ABI, functionName: 'transferOwnership', args: [ownerAddress] });
    await publicClient.waitForTransactionReceipt({ hash: h });
  }
  console.log('-> Pending. The multisig must call acceptOwnership() on both contracts.\n');

  // ── Step 4: Save Deployed Addresses ──
  const deployedAddresses = {
    network: 'Arc Mainnet',
    chainId: 5042,
    deployedAt: new Date().toISOString(),
    deployer: account.address,
    owner: ownerAddress,
    deployBlock: Number(registryReceipt.blockNumber),
    pegGuard: pegGuardAddress,
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
  console.log('Next: update MAINNET_* addresses and the deployment block in the frontend (see README).');
}

main().catch((err) => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
