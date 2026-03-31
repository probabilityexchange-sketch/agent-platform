import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/payments/token-pricing', () => ({
  quoteTokenAmountForUsd: vi.fn(async ({ usdAmount }: { usdAmount: string }) => {
    const amounts: Record<string, bigint> = {
      '5': BigInt(5_000_000),
      '20': BigInt(20_000_000),
      '100': BigInt(100_000_000),
    };

    return {
      usdAmount,
      tokenUsdPrice: '1.00',
      tokenAmountBaseUnits: amounts[usdAmount] ?? BigInt(5_000_000),
      tokenAmountDisplay: '5',
      source: 'mock',
    };
  }),
}));

import {
  getLiveUsagePackages,
  getUsagePackageDefinition,
  USAGE_PACKAGE_DEFINITIONS,
} from '@/lib/credits/usage-packages';

describe('usage packages', () => {
  it('defines three USD usage tiers', () => {
    expect(USAGE_PACKAGE_DEFINITIONS).toHaveLength(3);
    expect(USAGE_PACKAGE_DEFINITIONS.map(pkg => pkg.code)).toEqual(['starter', 'builder', 'scale']);
  });

  it('maps package codes to definitions', () => {
    expect(getUsagePackageDefinition('starter')?.usdPrice).toBe('5');
    expect(getUsagePackageDefinition('builder')?.usdPrice).toBe('20');
    expect(getUsagePackageDefinition('scale')?.usdPrice).toBe('100');
  });

  it('quotes live packs from the current token price', async () => {
    const packs = await getLiveUsagePackages();

    expect(packs).toHaveLength(3);
    expect(packs[0].creditAmount).toBeGreaterThan(0);
    expect(packs.map(pkg => pkg.usdPrice)).toEqual([5, 20, 100]);
    expect(packs.map(pkg => pkg.id)).toEqual(['starter', 'builder', 'scale']);
  });
});
