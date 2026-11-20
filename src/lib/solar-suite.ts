/**
 * @fileOverview Solar EPC Engineering, Pricing, and Workflow Engine.
 * Provides standardized sizing formulas, DC/AC ratios, yield estimations,
 * quotation calculations, and stage validation for the Solar Management Suite.
 */

export interface SolarBOMComponent {
  productId?: string;
  productName: string;
  category?: string;
  quantity: number;
  price?: number;
  gstRate?: number;
  specs?: string;
  unit?: string;
}

export interface SolarYieldEstimate {
  dailyYieldUnits: number;
  monthlyYieldUnits: number;
  annualYieldUnits: number;
  annualCo2OffsetKg: number;
}

export interface SolarPricingSummary {
  subtotal: number;
  taxTotal: number;
  grossTotal: number;
  discount: number;
  finalPayout: number;
}

/**
 * Calculates total DC peak capacity (kWp) from Bill of Materials.
 * Automatically inspects product names or specs for wattage (e.g. "540W", "550 Watt").
 */
export function calculateDcCapacityFromBOM(components: SolarBOMComponent[]): number {
  if (!Array.isArray(components) || components.length === 0) return 0;

  const panelItems = components.filter((c) => {
    const cat = String(c.category || '').toLowerCase();
    const name = String(c.productName || '').toLowerCase();
    return cat.includes('panel') || cat.includes('module') || name.includes('panel') || name.includes('module');
  });

  const totalKw = panelItems.reduce((sum, c) => {
    const qty = Number(c.quantity) || 0;
    if (qty <= 0) return sum;

    const textToMatch = `${c.productName || ''} ${c.specs || ''}`;
    const wattageMatch = textToMatch.match(/(\d+)\s*w(?:att)?/i);
    const wattage = wattageMatch ? parseInt(wattageMatch[1], 10) : 540;

    return sum + (wattage * qty) / 1000;
  }, 0);

  return Math.round(totalKw * 100) / 100;
}

/**
 * Computes DC/AC ratio between panel capacity (kWp) and inverter output rating (kW).
 */
export function computeDcAcRatio(
  dcCapacityKwp: number,
  acInverterKw: number
): {
  ratio: number;
  status: 'undersized' | 'optimal' | 'oversized' | 'invalid';
  recommendation: string;
} {
  if (dcCapacityKwp <= 0 || acInverterKw <= 0) {
    return {
      ratio: 0,
      status: 'invalid',
      recommendation: 'Specify positive values for both DC capacity and inverter rating.',
    };
  }

  const ratio = Math.round((dcCapacityKwp / acInverterKw) * 100) / 100;

  if (ratio < 1.0) {
    return {
      ratio,
      status: 'undersized',
      recommendation: 'DC capacity is lower than inverter rating. Inverter will run under-utilized.',
    };
  }
  if (ratio >= 1.1 && ratio <= 1.35) {
    return {
      ratio,
      status: 'optimal',
      recommendation: 'Optimal DC/AC loading factor (1.10 - 1.35x) maximizing generation ROI.',
    };
  }
  if (ratio > 1.35 && ratio <= 1.5) {
    return {
      ratio,
      status: 'oversized',
      recommendation: 'High DC loading. Minor clipping during peak summer mid-day is expected.',
    };
  }
  return {
    ratio,
    status: 'oversized',
    recommendation: 'Severely oversized DC capacity. Verify inverter maximum input current limits.',
  };
}

/**
 * Estimates energy generation (units/kWh) and CO2 reduction.
 * Standard Indian solar irradiance: 4.5 peak sun hours/day, 78% Performance Ratio (PR).
 */
export function calculateEstimatedSolarYield(
  capacityKwp: number,
  peakSunHours = 4.5,
  performanceRatio = 0.78
): SolarYieldEstimate {
  if (capacityKwp <= 0) {
    return {
      dailyYieldUnits: 0,
      monthlyYieldUnits: 0,
      annualYieldUnits: 0,
      annualCo2OffsetKg: 0,
    };
  }

  const dailyYield = capacityKwp * peakSunHours * performanceRatio;
  const monthlyYield = dailyYield * 30;
  const annualYield = dailyYield * 365;
  // CEA India emission factor: ~0.82 kg CO2 per kWh of grid solar replacement
  const annualCo2 = annualYield * 0.82;

  return {
    dailyYieldUnits: Math.round(dailyYield * 10) / 10,
    monthlyYieldUnits: Math.round(monthlyYield),
    annualYieldUnits: Math.round(annualYield),
    annualCo2OffsetKg: Math.round(annualCo2),
  };
}

/**
 * Computes quotation financials including item-level GST and net payout.
 */
export function calculateSolarQuotationTotals(
  items: Array<{ price: number; quantity: number; gstRate?: number }>,
  discount = 0
): SolarPricingSummary {
  if (!Array.isArray(items) || items.length === 0) {
    return { subtotal: 0, taxTotal: 0, grossTotal: 0, discount: 0, finalPayout: 0 };
  }

  const subtotal = items.reduce((sum, item) => {
    const p = Number(item.price) || 0;
    const q = Number(item.quantity) || 0;
    return sum + p * q;
  }, 0);

  const taxTotal = items.reduce((sum, item) => {
    const p = Number(item.price) || 0;
    const q = Number(item.quantity) || 0;
    const taxRate = Number(item.gstRate) || 0;
    return sum + (p * q * taxRate) / 100;
  }, 0);

  const grossTotal = Math.round((subtotal + taxTotal) * 100) / 100;
  const sanitizedDiscount = Math.max(0, Math.min(discount, grossTotal));
  const finalPayout = Math.round(grossTotal - sanitizedDiscount);

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
    grossTotal,
    discount: sanitizedDiscount,
    finalPayout,
  };
}

/**
 * Stage progress evaluation for Field Installations.
 */
export const SOLAR_INSTALLATION_MILESTONES: Record<string, number> = {
  READY_TO_SCHEDULE: 10,
  SCHEDULED: 25,
  TEAM_ASSIGNED: 40,
  MATERIAL_READY: 55,
  IN_PROGRESS: 70,
  QUALITY_CHECK: 85,
  COMMISSIONING: 95,
  HANDED_OVER: 100,
  ON_HOLD: 50,
  CANCELLED: 0,
};

export function getInstallationProgress(status: string): number {
  return SOLAR_INSTALLATION_MILESTONES[status] ?? 0;
}

/**
 * Validates whether an Inquiry is ready to transition to a Site Survey.
 */
export function validateInquiryForSurvey(inquiry: any): { canProceed: boolean; error?: string } {
  if (!inquiry) return { canProceed: false, error: 'Inquiry record not found.' };
  if (!inquiry.customerName?.trim()) return { canProceed: false, error: 'Customer name is required.' };
  if (!inquiry.customerPhone?.trim()) return { canProceed: false, error: 'Customer phone is required.' };
  return { canProceed: true };
}

/**
 * Validates whether a Site Survey is ready to create an Engineering Design.
 */
export function validateSurveyForDesign(survey: any): { canProceed: boolean; error?: string } {
  if (!survey) return { canProceed: false, error: 'Site survey record not found.' };
  if (survey.status !== 'APPROVED') {
    return { canProceed: false, error: 'Site survey must be APPROVED by engineering before creating a design.' };
  }
  return { canProceed: true };
}

/**
 * Validates whether a System Design is ready to generate a Commercial Quotation.
 */
export function validateDesignForQuotation(design: any): { canProceed: boolean; error?: string } {
  if (!design) return { canProceed: false, error: 'Design record not found.' };
  if (!Array.isArray(design.components) || design.components.length === 0) {
    return { canProceed: false, error: 'System design must have at least one BOM component item.' };
  }
  return { canProceed: true };
}

/**
 * Validates whether a Quotation is ready to launch field execution.
 */
export function validateQuotationForInstallation(quote: any): { canProceed: boolean; error?: string } {
  if (!quote) return { canProceed: false, error: 'Quotation record not found.' };
  if (quote.status !== 'converted') {
    return { canProceed: false, error: 'Quotation must be accepted ("converted") by the client to launch installation.' };
  }
  return { canProceed: true };
}
