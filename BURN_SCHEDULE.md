# $RANDI Burn Schedule

## Policy

The $RANDI burn rate is not fixed forever. It follows a published schedule tied to platform growth milestones. This document is the single source of truth for burn rate changes. Any adjustment will be announced on X and Telegram at least 7 days before taking effect.

The burn rate will only ever decrease, never increase. Early users get the most aggressive deflation as a reward for taking the earliest risk.

## Schedule

### Phase 1: Ignition (Current)
**Burn rate: 70% | Treasury: 30%**

- **Trigger**: Launch through 100 active users
- **Rationale**: Maximum deflation to reward early adopters and establish visible supply reduction. Platform costs are near zero due to free/open-source model usage. Treasury accumulates a small reserve without sell pressure.

### Phase 2: Growth
**Burn rate: 50% | Treasury: 50%**

- **Trigger**: 100+ active users OR monthly API costs exceed $500
- **Rationale**: User growth drives real compute costs as premium model usage increases. Treasury needs sustainable funding for GPT-4o, Claude, and infrastructure. 50/50 split maintains strong deflation while covering operations.

### Phase 3: Scale
**Burn rate: 40% | Treasury: 60%**

- **Trigger**: 1,000+ active users OR monthly API costs exceed $5,000
- **Rationale**: Platform is mature. Multi-region compute, expanded model access, and autonomous agent operations require consistent treasury funding. 40% burn still provides meaningful deflation at high transaction volume.

### Phase 4: Steady State
**Burn rate: 30% | Treasury: 70%**

- **Trigger**: 10,000+ active users OR platform reaches full autonomous operation
- **Rationale**: At scale, even a 30% burn rate with thousands of daily transactions creates substantial supply reduction. Treasury funds ongoing development, AI agent compute, and ecosystem growth.

## Rules

1. **Burns only decrease.** The burn rate will never be raised above its current phase level. Early supporters always got the best rate.

2. **Milestones are one-way.** Once a phase transition happens, it does not revert if user count drops. Phase 2 doesn't go back to Phase 1.

3. **7-day notice minimum.** Any rate change will be announced on X and Telegram at least 7 days before the on-chain configuration is updated.

4. **Verifiable on-chain.** Every burn transaction is logged with a memo tag (`randi:burn:{timestamp}`) and can be verified on Solscan via the treasury wallet address.

5. **Emergency clause.** If platform operational costs create an existential risk (treasury cannot cover API bills for 30+ days), the burn rate may be temporarily reduced below the current phase with full public disclosure of the financial situation. Transparency over optics.

## Governance (Future)

As the platform matures and the community grows, burn rate decisions may transition to $RANDI holder governance. Token holders could vote on phase transitions, giving the community direct control over monetary policy. This is a Phase 4+ consideration and will be designed when the platform reaches that scale.

## Changelog

| Date | Change | Announced |
|------|--------|-----------|
| 2026-02-24 | Phase 1 launched: 70% burn / 30% treasury | This document |

---

*This is a living document. The schedule and rules above represent commitments to the $RANDI community. Any updates will be versioned in the changelog.*
