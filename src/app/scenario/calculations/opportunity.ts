/**
 * Total opportunity cost over `years` from withholding `principal` from
 * an investment growing at `rate`. Uses simple compound growth - principal.
 */
export function opportunityCostOverYears(
  principal: number,
  rate: number,
  years: number,
): number {
  if (principal <= 0 || rate <= 0 || years <= 0) return 0;
  return principal * (Math.pow(1 + rate, years) - 1);
}

/**
 * Smooths total opportunity cost across months for a smooth chart line.
 */
export function opportunityCostMonthly(
  principal: number,
  rate: number,
  months: number,
): number[] {
  const out: number[] = new Array(months + 1).fill(0);
  if (principal <= 0 || rate <= 0 || months <= 0) return out;
  const monthlyRate = Math.pow(1 + rate, 1 / 12) - 1;
  for (let m = 1; m <= months; m++) {
    out[m] = principal * (Math.pow(1 + monthlyRate, m) - 1);
  }
  return out;
}