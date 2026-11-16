/**
 * Persat Finance — minimal ABIs for frontend interaction.
 * Only includes the functions/events the UI actually calls.
 */

/** Custom errors of the Persat contracts (and ERC-20 transfer errors), so viem can decode reverts. */
export const PERSAT_ERRORS = [
  { type: 'error', name: 'CircBTCRescueBlocked', inputs: [] },
  { type: 'error', name: 'ClaimTokenAlreadyUsed', inputs: [] },
  { type: 'error', name: 'DealAlreadyExists', inputs: [] },
  { type: 'error', name: 'DealNotActive', inputs: [] },
  { type: 'error', name: 'DealNotFound', inputs: [] },
  { type: 'error', name: 'EnforcedPause', inputs: [] },
  { type: 'error', name: 'ERC20InsufficientAllowance', inputs: [{ name: 'spender', type: 'address' }, { name: 'allowance', type: 'uint256' }, { name: 'needed', type: 'uint256' }] },
  { type: 'error', name: 'ERC20InsufficientBalance', inputs: [{ name: 'sender', type: 'address' }, { name: 'balance', type: 'uint256' }, { name: 'needed', type: 'uint256' }] },
  { type: 'error', name: 'ExpectedPause', inputs: [] },
  { type: 'error', name: 'FeeTooHigh', inputs: [] },
  { type: 'error', name: 'InitialLtvTooHigh', inputs: [{ name: 'ltvBps', type: 'uint256' }, { name: 'maxLtvBps', type: 'uint256' }] },
  { type: 'error', name: 'InsufficientLTV', inputs: [] },
  { type: 'error', name: 'InvalidClaimToken', inputs: [] },
  { type: 'error', name: 'InvalidDealId', inputs: [] },
  { type: 'error', name: 'InvalidParameter', inputs: [] },
  { type: 'error', name: 'InvalidSignature', inputs: [] },
  { type: 'error', name: 'InvalidState', inputs: [{ name: 'current', type: 'uint8' }, { name: 'required', type: 'uint8' }] },
  { type: 'error', name: 'InvalidTerms', inputs: [] },
  { type: 'error', name: 'LTVHealthy', inputs: [] },
  { type: 'error', name: 'MaxCounterOffersReached', inputs: [] },
  { type: 'error', name: 'NotBorrower', inputs: [] },
  { type: 'error', name: 'NotVault', inputs: [] },
  { type: 'error', name: 'OfferNotFound', inputs: [] },
  { type: 'error', name: 'OracleInvalidPrice', inputs: [] },
  { type: 'error', name: 'OracleStale', inputs: [] },
  { type: 'error', name: 'OwnableInvalidOwner', inputs: [{ name: 'owner', type: 'address' }] },
  { type: 'error', name: 'OwnableUnauthorizedAccount', inputs: [{ name: 'account', type: 'address' }] },
  { type: 'error', name: 'ReentrancyGuardReentrantCall', inputs: [] },
  { type: 'error', name: 'RepaymentFailed', inputs: [] },
  { type: 'error', name: 'SafeERC20FailedOperation', inputs: [{ name: 'token', type: 'address' }] },
  { type: 'error', name: 'SelfMatch', inputs: [] },
  { type: 'error', name: 'SignatureRequired', inputs: [] },
  { type: 'error', name: 'TermsHashMismatch', inputs: [] },
  { type: 'error', name: 'Unauthorized', inputs: [] },
  { type: 'error', name: 'VaultAlreadySet', inputs: [] },
  { type: 'error', name: 'ZeroAddress', inputs: [] },
] as const

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
  {
    name: 'dealIdPrefix',
    type: 'function',
    stateMutability: 'pure',
    inputs: [{ name: 'proposer', type: 'address' }],
    outputs: [{ name: '', type: 'bytes8' }],
  },
  {
    name: 'claimDigest',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'dealId', type: 'bytes16' },
      { name: 'claimer', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'claimSigner',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'dealId', type: 'bytes16' }],
    outputs: [{ name: '', type: 'address' }],
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
    name: 'claimDealWithSignature',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'dealId', type: 'bytes16' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'cancelCounterOffer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'dealId', type: 'bytes16' },
      { name: 'offerId', type: 'uint256' },
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
  ...PERSAT_ERRORS,
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
    name: 'amountDue',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'dealId', type: 'bytes16' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'maturityOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'dealId', type: 'bytes16' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'maxInitialLtvBps',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
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
      { name: 'disbursedToBorrower', type: 'uint256', indexed: false },
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
  ...PERSAT_ERRORS,
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
