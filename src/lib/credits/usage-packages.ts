import { quoteTokenAmountForUsd } from '@/lib/payments/token-pricing';
import { getCallCost, TOKEN_DECIMALS, TOKEN_MINT } from '@/lib/tokenomics';

export type UsagePackageCode = 'starter' | 'builder' | 'scale';

export type UsagePackageDefinition = {
  code: UsagePackageCode;
  name: string;
  usdPrice: string;
  bonusPercent: number;
};

export type LiveUsagePackage = {
  id: UsagePackageCode;
  code: UsagePackageCode;
  name: string;
  creditAmount: number;
  usdPrice: number;
  bonusPercent: number;
  estimatedStandardCalls: number;
  estimatedPremiumCalls: number;
  type: 'payg';
  priceTokens: string;
  tokenUsdPrice: string;
  tokenMint: string;
};

export const USAGE_PACKAGE_DEFINITIONS: UsagePackageDefinition[] = [
  { code: 'starter', name: 'Starter Credits', usdPrice: '5', bonusPercent: 0 },
  { code: 'builder', name: 'Builder Credits', usdPrice: '20', bonusPercent: 0 },
  { code: 'scale', name: 'Scale Credits', usdPrice: '100', bonusPercent: 0 },
];

function toWholeCredits(amountBaseUnits: bigint): number {
  const decimals = BigInt(10 ** TOKEN_DECIMALS);
  return Number((amountBaseUnits + decimals - BigInt(1)) / decimals);
}

export function getUsagePackageDefinition(code: string): UsagePackageDefinition | undefined {
  return USAGE_PACKAGE_DEFINITIONS.find(pkg => pkg.code === code);
}

export async function getLiveUsagePackages(): Promise<LiveUsagePackage[]> {
  const standardCost = getCallCost('llama-3.3-70b-instruct:free').finalCost;
  const premiumCost = getCallCost('gpt-4o').finalCost;

  const packages = await Promise.all(
    USAGE_PACKAGE_DEFINITIONS.map(async definition => {
      const quote = await quoteTokenAmountForUsd({
        usdAmount: definition.usdPrice,
        tokenMint: TOKEN_MINT,
        tokenDecimals: TOKEN_DECIMALS,
      });

      const creditAmount = toWholeCredits(quote.tokenAmountBaseUnits);

      return {
        id: definition.code,
        code: definition.code,
        name: definition.name,
        creditAmount,
        usdPrice: Number(definition.usdPrice),
        bonusPercent: definition.bonusPercent,
        estimatedStandardCalls: Math.max(1, Math.floor(creditAmount / standardCost)),
        estimatedPremiumCalls: Math.max(1, Math.floor(creditAmount / premiumCost)),
        type: 'payg' as const,
        priceTokens: quote.tokenAmountBaseUnits.toString(),
        tokenUsdPrice: quote.tokenUsdPrice,
        tokenMint: TOKEN_MINT,
      };
    })
  );

  return packages;
}
