import { depreciationFactor } from './depreciation';

/**
 * For a used car, back-derive what the original sticker price was so we can size
 * maintenance and category multipliers off the real "new" value, not the discount price.
 */
export function backDeriveMsrp(purchasePrice: number, age: number): number {
  if (age <= 0) return purchasePrice;
  const factor = depreciationFactor(age);
  return factor === 0 ? purchasePrice : purchasePrice / factor;
}