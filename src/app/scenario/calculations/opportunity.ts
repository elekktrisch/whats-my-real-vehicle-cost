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

/**
 * Cumulative compounded opportunity cost from a stream of cash injections.
 * Each {month, amount} loses (1+monthlyRate)^(m - month) - 1 fraction of its
 * value by month m. Used for renew-lease scenarios where each cycle adds a
 * fresh down payment that compounds independently from its injection time.
 */
export function opportunityCostStream(
  injections: { month: number; amount: number }[],
  rate: number,
  months: number,
): number[] {
  const out: number[] = new Array(months + 1).fill(0);
  if (rate <= 0 || months <= 0 || injections.length === 0) return out;
  const monthlyRate = Math.pow(1 + rate, 1 / 12) - 1;
  for (let m = 1; m <= months; m++) {
    let total = 0;
    for (const { month, amount } of injections) {
      if (month <= m && amount > 0) {
        total += amount * (Math.pow(1 + monthlyRate, m - month) - 1);
      }
    }
    out[m] = total;
  }
  return out;
}