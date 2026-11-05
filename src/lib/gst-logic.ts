
export interface GstCalculationResult {
  taxableAmount: number;
  taxAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  isInterState: boolean;
}

export function calculateGst(
  amount: number,
  gstRate: number,
  mode: 'inclusive' | 'exclusive',
  businessState: string,
  partyState: string
): GstCalculationResult {
  let taxableAmount = 0;
  let taxAmount = 0;

  if (mode === 'inclusive') {
    taxableAmount = amount / (1 + gstRate / 100);
    taxAmount = amount - taxableAmount;
  } else {
    taxableAmount = amount;
    taxAmount = amount * (gstRate / 100);
  }

  const isInterState = businessState.toLowerCase() !== partyState.toLowerCase();
  
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isInterState) {
    igst = taxAmount;
  } else {
    cgst = taxAmount / 2;
    sgst = taxAmount / 2;
  }

  return {
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    cgst: Math.round(cgst * 100) / 100,
    sgst: Math.round(sgst * 100) / 100,
    igst: Math.round(igst * 100) / 100,
    totalAmount: Math.round((taxableAmount + taxAmount) * 100) / 100,
    isInterState,
  };
}
