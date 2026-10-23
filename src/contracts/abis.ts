/**
 * Persat Finance — minimal ABIs for frontend interaction.
 * Only includes the functions/events the UI actually calls.
 */

export const REGISTRY_ABI = [
  // Read
  {
    name: 'getDeal',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'dealId', type: 'bytes16' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'dealId', type: 'bytes16' },
          { name: 'borrower', type: 'address' },
          { name: 'lender', type: 'address' },
          { name: 'principal', type: 'uint256' },
          { name: 'collateral', type: 'uint256' },
          { name: 'rateBps', type: 'uint256' },
          { name: 'durationMonths', type: 'uint8' },
          { name: 'visibility', type: 'uint8' },
          { name: 'state', type: 'uint8' },
          { name: 'termsHash', type: 'bytes32' },
          { name: 'claimToken', type: 'bytes32' },
          { name: 'reservedFor', type: 'address' },
          { name: 'activatedAt', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'getCounterOffers',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'dealId', type: 'bytes16' }],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'offerId', type: 'uint256' },
          { name: 'proposer', type: 'address' },
          { name: 'principal', type: 'uint256' },
          { name: 'collateral', type: 'uint256' },
          { name: 'rateBps', type: 'uint256' },
          { name: 'durationMonths', type: 'uint8' },
          { name: 'active', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'feeBps',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // Write
  {
    name: 'proposeDeal',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'dealId', type: 'bytes16' },
      { name: 'callerIsBorrower', type: 'bool' },
      { name: 'reservedFor', type: 'address' },
      { name: 'principal', type: 'uint256' },
      { name: 'collateral', type: 'uint256' },
      { name: 'rateBps', type: 'uint256' },
      { name: 'durationMonths', type: 'uint8' },
      { name: 'visibility', type: 'uint8' },
      { name: 'salt', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'claimDeal',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'dealId', type: 'bytes16' },
      { name: 'salt', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'submitCounterOffer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'dealId', type: 'bytes16' },
      { name: 'principal', type: 'uint256' },
      { name: 'collateral', type: 'uint256' },
      { name: 'rateBps', type: 'uint256' },
      { name: 'durationMonths', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    name: 'acceptCounterOffer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'dealId', type: 'bytes16' },
      { name: 'offerId', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'cancelDeal',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'dealId', type: 'bytes16' }],
    outputs: [],
  },
  // Events
  {
    name: 'DealProposed',
    type: 'event',
    inputs: [
      { name: 'dealId', type: 'bytes16', indexed: true },
      { name: 'proposer', type: 'address', indexed: true },
      { name: 'visibility', type: 'uint8', indexed: false },
    ],
  },
  {
    name: 'DealConfirmed',
    type: 'event',
    inputs: [
      { name: 'dealId', type: 'bytes16', indexed: true },
      { name: 'borrower', type: 'address', indexed: true },
      { name: 'lender', type: 'address', indexed: true },
      { name: 'termsHash', type: 'bytes32', indexed: false },
    ],
  },
] as const

export const VAULT_ABI = [
  // Read
  {
    name: 'lockedCollateral',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'dealId', type: 'bytes16' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'claimableUsdc',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'dealId', type: 'bytes16' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'liquidationThresholdBps',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // Write
  {
    name: 'activateLoan',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'dealId', type: 'bytes16' }],
    outputs: [],
  },
  {
    name: 'claimPrincipal',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'dealId', type: 'bytes16' }],
    outputs: [],
  },
  {
    name: 'repayLoan',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'dealId', type: 'bytes16' }],
    outputs: [],
  },
  {
    name: 'liquidate',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'dealId', type: 'bytes16' }],
    outputs: [],
  },
  {
    name: 'markDefault',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'dealId', type: 'bytes16' }],
    outputs: [],
  },
  // Events
  {
    name: 'LoanActivated',
    type: 'event',
    inputs: [
      { name: 'dealId', type: 'bytes16', indexed: true },
      { name: 'borrower', type: 'address', indexed: true },
      { name: 'lender', type: 'address', indexed: true },
      { name: 'principal', type: 'uint256', indexed: false },
      { name: 'collateral', type: 'uint256', indexed: false },
      { name: 'fee', type: 'uint256', indexed: false },
      { name: 'claimableUsdcAmount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'LoanRepaid',
    type: 'event',
    inputs: [
      { name: 'dealId', type: 'bytes16', indexed: true },
      { name: 'totalRepayment', type: 'uint256', indexed: false },
      { name: 'collateralReleased', type: 'uint256', indexed: false },
    ],
  },
] as const

export const ERC20_APPROVE_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const
