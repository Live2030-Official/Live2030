/**
 * USD -> SAR conversion rate.
 *
 * A single source of truth for pricing so the store, payment reconciliation and
 * financial reports never disagree. Override with the `USD_TO_SAR` env var when
 * the pegged rate changes; defaults to the current 3.75 peg.
 */
export function usdToSarRate(): number {
  const parsed = Number(process.env.USD_TO_SAR);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3.75;
}

export function sarToUsd(amountSAR: number): number {
  return parseFloat((Number(amountSAR || 0) / usdToSarRate()).toFixed(4));
}

export function usdToSar(amountUSD: number): number {
  return parseFloat((Number(amountUSD || 0) * usdToSarRate()).toFixed(2));
}
