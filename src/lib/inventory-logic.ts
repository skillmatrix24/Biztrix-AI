export const STOCK_IMPACT_MAP: Record<string, 'increase' | 'decrease' | 'none'> = {
  'credit': 'decrease', // Sale
  'debit': 'increase',  // Purchase
  'nc': 'decrease',     // Free sample / Waste
  'due': 'decrease',    // Udhaar sale - treated as sale
};

export const getStockImpact = (type: string): 'increase' | 'decrease' | 'none' => {
  return STOCK_IMPACT_MAP[type.toLowerCase()] || 'none';
};
