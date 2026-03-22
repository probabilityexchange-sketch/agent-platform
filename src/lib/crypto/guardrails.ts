import {
  cryptoGuardrailDecisionSchema,
  cryptoGuardrailEvaluationInputSchema,
  type CryptoDestinationAllowlistEntry,
  type CryptoGuardrailDecision,
  type CryptoGuardrailEvaluationInput,
} from '@/lib/crypto/schema';

const CRYPTO_TOOL_PATTERNS: RegExp[] = [
  /^STRIPE_/i,
  /^COINBASE_/i,
  /^BINANCE_/i,
  /^KRAKEN_/i,
  /^BYBIT_/i,
  /^OKX_/i,
  /^UNISWAP_/i,
  /^JUPITER_/i,
  /^SOLANA_/i,
  /^WALLET_/i,
  /^PAYMENT_/i,
  /^TRADING_/i,
];

const READ_ONLY_TOOL_PATTERNS: RegExp[] = [
  /_GET_/i,
  /_FETCH_/i,
  /_LIST_/i,
  /_SEARCH_/i,
  /_FIND_/i,
  /_READ_/i,
  /BALANCE/i,
  /QUOTE/i,
  /PRICE/i,
  /ORDERBOOK/i,
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeNumberLike(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return String(value);
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return null;
}

function extractFirst(args: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = normalizeString(args[key]) ?? normalizeNumberLike(args[key]);
    if (value) return value;
  }
  return null;
}

function extractEstimatedUsdCents(toolName: string, args: Record<string, unknown>): number | null {
  const directCents = ['estimatedUsdCents', 'amountUsdCents', 'usdCents', 'fiatAmountCents'];
  for (const key of directCents) {
    const value = args[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return Math.round(value);
    }
  }

  const dollarKeys = ['estimatedUsd', 'amountUsd', 'usdAmount', 'fiatAmount', 'totalUsd'];
  for (const key of dollarKeys) {
    const value = args[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return Math.round(value * 100);
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed >= 0) {
        return Math.round(parsed * 100);
      }
    }
  }

  const currency = normalizeString(args.currency)?.toLowerCase();
  const amount = args.amount;
  if (
    /^STRIPE_/i.test(toolName) &&
    currency === 'usd' &&
    typeof amount === 'number' &&
    Number.isFinite(amount) &&
    amount >= 0
  ) {
    return Math.round(amount);
  }

  return null;
}

function isReadOnlyTool(toolName: string): boolean {
  return READ_ONLY_TOOL_PATTERNS.some(pattern => pattern.test(toolName));
}

function matchesAllowlist(
  destination: string,
  asset: string | null,
  entries: CryptoDestinationAllowlistEntry[]
): boolean {
  const normalizedDestination = destination.toLowerCase();
  const normalizedAsset = asset?.toLowerCase() ?? null;

  return entries.some(entry => {
    if (!entry.active) return false;
    if (entry.destination.toLowerCase() !== normalizedDestination) return false;
    if (!entry.asset) return true;
    return normalizedAsset === entry.asset.toLowerCase();
  });
}

function classifyCryptoAction(input: CryptoGuardrailEvaluationInput) {
  if (input.subjectType === 'workflow_run') {
    const workflow = input.workflow;
    if (!workflow?.safety.containsFinancialSteps) {
      return {
        isCryptoRelated: false,
        cryptoActionType: 'none' as const,
        riskLevel: 'low' as const,
        asset: null,
        amount: null,
        estimatedUsdCents: null,
        destination: null,
        writeLike: false,
        scopes: [],
      };
    }

    return {
      isCryptoRelated: true,
      cryptoActionType: 'unknown' as const,
      riskLevel: workflow.safety.riskLevel === 'high' ? ('critical' as const) : ('high' as const),
      asset: null,
      amount: null,
      estimatedUsdCents: null,
      destination: null,
      writeLike: true,
      scopes: ['workflow:financial_step'],
    };
  }

  const tool = input.tool;
  if (!tool) {
    return {
      isCryptoRelated: false,
      cryptoActionType: 'none' as const,
      riskLevel: 'low' as const,
      asset: null,
      amount: null,
      estimatedUsdCents: null,
      destination: null,
      writeLike: false,
      scopes: [],
    };
  }

  const toolName = tool.toolName;
  const args = isRecord(tool.toolArgs) ? tool.toolArgs : {};
  const financial = CRYPTO_TOOL_PATTERNS.some(pattern => pattern.test(toolName));
  const readOnly = isReadOnlyTool(toolName);

  if (!financial) {
    return {
      isCryptoRelated: false,
      cryptoActionType: 'none' as const,
      riskLevel: 'low' as const,
      asset: null,
      amount: null,
      estimatedUsdCents: null,
      destination: null,
      writeLike: false,
      scopes: [],
    };
  }

  const normalizedName = toolName.toUpperCase();
  const cryptoActionType = normalizedName.includes('TRADE')
    ? 'trading'
    : normalizedName.includes('SWAP')
      ? 'swap'
      : normalizedName.includes('PAY') ||
          normalizedName.includes('STRIPE') ||
          normalizedName.includes('PAYMENT')
        ? 'payment'
        : normalizedName.includes('TRANSFER') || normalizedName.includes('SEND')
          ? 'wallet_transfer'
          : normalizedName.includes('APPROVE')
            ? 'approval'
            : readOnly
              ? 'wallet_read'
              : 'wallet_write';

  const asset = extractFirst(args, [
    'asset',
    'symbol',
    'token',
    'currency',
    'baseAsset',
    'quoteAsset',
    'mint',
  ]);
  const amount = extractFirst(args, [
    'amount',
    'value',
    'quantity',
    'size',
    'notional',
    'lamports',
  ]);
  const estimatedUsdCents = extractEstimatedUsdCents(toolName, args);
  const destination = extractFirst(args, [
    'destination',
    'destinationAddress',
    'address',
    'walletAddress',
    'to',
    'recipient',
    'receiver',
    'payee',
    'account',
  ]);

  return {
    isCryptoRelated: true,
    cryptoActionType,
    riskLevel: readOnly ? ('medium' as const) : ('critical' as const),
    asset,
    amount,
    estimatedUsdCents,
    destination,
    writeLike: !readOnly,
    scopes: [toolName],
  };
}

export function evaluateCryptoGuardrails(
  input: CryptoGuardrailEvaluationInput
): CryptoGuardrailDecision {
  const parsed = cryptoGuardrailEvaluationInputSchema.parse(input);
  const classification = classifyCryptoAction(parsed);

  if (!classification.isCryptoRelated) {
    return cryptoGuardrailDecisionSchema.parse({
      subjectType: parsed.subjectType,
      cryptoActionType: classification.cryptoActionType,
      isCryptoRelated: false,
      riskLevel: classification.riskLevel,
      asset: null,
      amount: null,
      estimatedUsdCents: null,
      destination: null,
      scopes: [],
      decision: 'allow',
      reason: 'Action is not crypto-related and does not require crypto guardrails.',
      requiresApproval: false,
      simulateOnly: false,
      capStatus: 'not_applicable',
      allowlistStatus: 'not_applicable',
      configPresent: Boolean(parsed.config),
      metadata: {},
    });
  }

  if (!classification.writeLike) {
    return cryptoGuardrailDecisionSchema.parse({
      subjectType: parsed.subjectType,
      cryptoActionType: classification.cryptoActionType,
      isCryptoRelated: true,
      riskLevel: classification.riskLevel,
      asset: classification.asset,
      amount: classification.amount,
      estimatedUsdCents: classification.estimatedUsdCents,
      destination: classification.destination,
      scopes: classification.scopes,
      decision: 'allow',
      reason: 'Read-only crypto action may proceed, but it remains auditable.',
      requiresApproval: false,
      simulateOnly: false,
      capStatus: 'not_applicable',
      allowlistStatus: 'not_applicable',
      configPresent: Boolean(parsed.config),
      metadata: { readOnly: true },
    });
  }

  if (parsed.triggerSource === 'schedule' && parsed.config?.blockScheduledCrypto !== false) {
    return cryptoGuardrailDecisionSchema.parse({
      subjectType: parsed.subjectType,
      cryptoActionType: classification.cryptoActionType,
      isCryptoRelated: true,
      riskLevel: 'critical',
      asset: classification.asset,
      amount: classification.amount,
      estimatedUsdCents: classification.estimatedUsdCents,
      destination: classification.destination,
      scopes: classification.scopes,
      decision: 'deny',
      reason:
        'Scheduled crypto, trading, wallet, and payment actions remain blocked from autonomous execution.',
      requiresApproval: true,
      simulateOnly: false,
      capStatus: parsed.config ? 'missing_amount' : 'missing_config',
      allowlistStatus: classification.destination ? 'not_allowlisted' : 'missing_destination',
      configPresent: Boolean(parsed.config),
      metadata: { triggerSource: parsed.triggerSource },
    });
  }

  if (!parsed.config) {
    return cryptoGuardrailDecisionSchema.parse({
      subjectType: parsed.subjectType,
      cryptoActionType: classification.cryptoActionType,
      isCryptoRelated: true,
      riskLevel: 'critical',
      asset: classification.asset,
      amount: classification.amount,
      estimatedUsdCents: classification.estimatedUsdCents,
      destination: classification.destination,
      scopes: classification.scopes,
      decision: 'simulate',
      reason:
        'No crypto guardrail configuration exists yet, so live crypto execution stays simulate-only.',
      requiresApproval: true,
      simulateOnly: true,
      capStatus: 'missing_config',
      allowlistStatus: classification.destination ? 'not_allowlisted' : 'missing_destination',
      configPresent: false,
      metadata: {},
    });
  }

  if (classification.estimatedUsdCents == null) {
    return cryptoGuardrailDecisionSchema.parse({
      subjectType: parsed.subjectType,
      cryptoActionType: classification.cryptoActionType,
      isCryptoRelated: true,
      riskLevel: 'critical',
      asset: classification.asset,
      amount: classification.amount,
      estimatedUsdCents: null,
      destination: classification.destination,
      scopes: classification.scopes,
      decision: parsed.config.defaultDecision,
      reason: 'Crypto action amount is not explicit enough to enforce transaction caps safely.',
      requiresApproval: true,
      simulateOnly: parsed.config.defaultDecision === 'simulate',
      capStatus: 'missing_amount',
      allowlistStatus: classification.destination ? 'not_allowlisted' : 'missing_destination',
      configPresent: true,
      metadata: {},
    });
  }

  if (classification.estimatedUsdCents > parsed.config.perTransactionUsdCapCents) {
    return cryptoGuardrailDecisionSchema.parse({
      subjectType: parsed.subjectType,
      cryptoActionType: classification.cryptoActionType,
      isCryptoRelated: true,
      riskLevel: 'critical',
      asset: classification.asset,
      amount: classification.amount,
      estimatedUsdCents: classification.estimatedUsdCents,
      destination: classification.destination,
      scopes: classification.scopes,
      decision: 'deny',
      reason: 'Crypto action exceeds the configured per-transaction hard cap.',
      requiresApproval: true,
      simulateOnly: false,
      capStatus: 'over_cap',
      allowlistStatus: classification.destination ? 'not_allowlisted' : 'missing_destination',
      configPresent: true,
      metadata: { perTransactionUsdCapCents: parsed.config.perTransactionUsdCapCents },
    });
  }

  const allowlistStatus = !parsed.config.enforceDestinationAllowlist
    ? 'not_applicable'
    : !classification.destination
      ? 'missing_destination'
      : matchesAllowlist(classification.destination, classification.asset, parsed.destinations)
        ? 'allowlisted'
        : 'not_allowlisted';

  if (allowlistStatus === 'missing_destination') {
    return cryptoGuardrailDecisionSchema.parse({
      subjectType: parsed.subjectType,
      cryptoActionType: classification.cryptoActionType,
      isCryptoRelated: true,
      riskLevel: 'critical',
      asset: classification.asset,
      amount: classification.amount,
      estimatedUsdCents: classification.estimatedUsdCents,
      destination: classification.destination,
      scopes: classification.scopes,
      decision: parsed.config.defaultDecision,
      reason:
        'Crypto action destination is not explicit enough to enforce destination allowlists safely.',
      requiresApproval: true,
      simulateOnly: parsed.config.defaultDecision === 'simulate',
      capStatus: 'within_cap',
      allowlistStatus,
      configPresent: true,
      metadata: {},
    });
  }

  if (allowlistStatus === 'not_allowlisted') {
    return cryptoGuardrailDecisionSchema.parse({
      subjectType: parsed.subjectType,
      cryptoActionType: classification.cryptoActionType,
      isCryptoRelated: true,
      riskLevel: 'critical',
      asset: classification.asset,
      amount: classification.amount,
      estimatedUsdCents: classification.estimatedUsdCents,
      destination: classification.destination,
      scopes: classification.scopes,
      decision: 'approve',
      reason:
        'Destination is not allowlisted, so the action requires explicit approval and remains blocked from auto-execution.',
      requiresApproval: true,
      simulateOnly: false,
      capStatus: 'within_cap',
      allowlistStatus,
      configPresent: true,
      metadata: {},
    });
  }

  return cryptoGuardrailDecisionSchema.parse({
    subjectType: parsed.subjectType,
    cryptoActionType: classification.cryptoActionType,
    isCryptoRelated: true,
    riskLevel: 'critical',
    asset: classification.asset,
    amount: classification.amount,
    estimatedUsdCents: classification.estimatedUsdCents,
    destination: classification.destination,
    scopes: classification.scopes,
    decision: 'approve',
    reason:
      'Crypto action is within the configured cap and destination allowlist, but still requires explicit approval before live execution.',
    requiresApproval: true,
    simulateOnly: false,
    capStatus: 'within_cap',
    allowlistStatus,
    configPresent: true,
    metadata: { cappedAndAllowlisted: true },
  });
}
