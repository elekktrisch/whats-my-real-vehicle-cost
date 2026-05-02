/**
 * Multiply MSRP by this to get the resale value at `age`.
 * Curve: ~20% loss yr1, 15%/yr yr2-5, 10%/yr after.
 */
export function depreciationFactor(age: number): number {
  if (age <= 0) return 1;
  let factor = 0.8;
  for (let y = 2; y <= age; y++) {
    factor *= y <= 5 ? 0.85 : 0.9;
  }
  return factor;
}