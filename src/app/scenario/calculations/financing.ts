import type { Region } from '../scenario.types';

export interface LeasePaymentInputs {
  capCost: number;
  downPayment: number;
  residualValue: number;
  apr: number;
  termMonths: number;
  region: Region;
}

export interface LeasePaymentResult {
  adjustedCapCost: number;
  moneyFactor: number;
  depreciationFee: number;
  financeFee: number;
  monthlyPayment: number;
}

export function leasePayment(input: LeasePaymentInputs): LeasePaymentResult {
  const adjustedCapCost = Math.max(input.capCost - input.downPayment, 0);
  const moneyFactor = input.apr / 2400;
  const term = Math.max(input.termMonths, 1);
  const depreciationFee = Math.max((adjustedCapCost - input.residualValue) / term, 0);
  // US "money factor" charges interest on the average balance over the lease
  // (cap + residual). Typical EU/Swiss contracts charge interest only on the
  // financed amount — the residual is the lessor's risk, not a balance the
  // lessee pays interest on.
  const financeFeeBasis =
    input.region === 'EU' ? adjustedCapCost : adjustedCapCost + input.residualValue;
  const financeFee = financeFeeBasis * moneyFactor;
  return {
    adjustedCapCost,
    moneyFactor,
    depreciationFee,
    financeFee,
    monthlyPayment: depreciationFee + financeFee,
  };
}

export interface FinancePaymentInputs {
  principal: number;
  apr: number;
  termMonths: number;
}

export function financePayment(input: FinancePaymentInputs): number {
  const principal = Math.max(input.principal, 0);
  const term = Math.max(input.termMonths, 1);
  const monthlyRate = input.apr / 100 / 12;
  if (monthlyRate === 0) return principal / term;
  const factor = Math.pow(1 + monthlyRate, term);
  return (principal * monthlyRate * factor) / (factor - 1);
}