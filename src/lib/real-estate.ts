/**
 * Real Estate Suite Engine
 * Standardized utility functions for land area unit conversions, pricing models,
 * agent performance ranking, customer lead privacy masking, and CRM pipeline progression.
 */

export type AreaUnit = 'sq.ft' | 'sq.yd' | 'Guntha' | 'Acre' | 'Bigha';

export type PropertyType = 'Khet' | 'Plot' | 'Building' | 'Farmhouse' | 'Chukta' | string;

export type LeadStage = 'new' | 'contacted' | 'site-visit' | 'negotiation' | 'won' | 'lost' | string;

// Standard sq.ft conversion factors
export const AREA_CONVERSION_TO_SQFT: Record<AreaUnit, number> = {
  'sq.ft': 1,
  'sq.yd': 9,
  'Guntha': 1089,
  'Acre': 43560,
  'Bigha': 27225, // Standard Central/North India (approx 2.5 Guntha x 10 or 0.625 Acre)
};

/**
 * Converts area between any supported land measurement units.
 */
export function convertAreaUnits(value: number, fromUnit: AreaUnit, toUnit: AreaUnit): number {
  if (value <= 0 || isNaN(value)) return 0;
  if (fromUnit === toUnit) return value;

  const sqftPerFrom = AREA_CONVERSION_TO_SQFT[fromUnit] || 1;
  const sqftPerTo = AREA_CONVERSION_TO_SQFT[toUnit] || 1;

  const inSqft = value * sqftPerFrom;
  const converted = inSqft / sqftPerTo;

  // Round to 4 decimal places for precision
  return Math.round(converted * 10000) / 10000;
}

/**
 * Calculates total valuation for a property based on its asset type and unit rates.
 */
export function calculatePropertyPrice(
  type: PropertyType,
  rate: number,
  sizeOrArea: number,
  companyRate: number = 0
): {
  marketPrice: number;
  companyPrice: number;
  margin: number;
  ratePerUnit: number;
} {
  const safeRate = Math.max(0, rate || 0);
  const safeSize = Math.max(0, sizeOrArea || 0);
  const safeCompRate = Math.max(0, companyRate || 0);

  let marketPrice = 0;
  let companyPrice = 0;

  if (type === 'Khet' || type === 'Farmhouse') {
    marketPrice = safeRate * safeSize;
    companyPrice = safeCompRate > 0 ? safeCompRate * safeSize : 0;
  } else if (type === 'Plot') {
    marketPrice = safeRate * safeSize;
    companyPrice = safeCompRate > 0 ? safeCompRate * safeSize : 0;
  } else {
    // Fixed / Lumpsum Asset (Building, Chukta, Apartment)
    marketPrice = safeRate;
    companyPrice = safeCompRate;
  }

  const margin = marketPrice > companyPrice && companyPrice > 0 ? marketPrice - companyPrice : 0;
  const ratePerUnit = safeSize > 0 ? marketPrice / safeSize : safeRate;

  return {
    marketPrice: Math.round(marketPrice),
    companyPrice: Math.round(companyPrice),
    margin: Math.round(margin),
    ratePerUnit: Math.round(ratePerUnit * 100) / 100,
  };
}

/**
 * Masks buyer name to maintain lead confidentiality across team members.
 * e.g., "Rahul Sharma" -> "R***a"
 */
export function maskClientName(name?: string): string {
  if (!name || name.trim().length === 0) return 'Confidential Client';
  const clean = name.trim();
  if (clean.length <= 2) return `${clean[0]}*`;
  return `${clean[0]}***${clean[clean.length - 1]}`;
}

/**
 * Masks buyer contact number to protect agent exclusivity.
 * e.g., "+919876543210" -> "98******10"
 */
export function maskClientPhone(phone?: string): string {
  if (!phone || phone.trim().length === 0) return 'Protected';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 5) return 'Protected';
  const start = digits.slice(-10, -8);
  const end = digits.slice(-2);
  return `${start}******${end}`;
}

export interface AgentPerformanceMetric {
  id: string;
  agentName: string;
  totalSales: number;
  assignedAssets: number;
  activeLeads: number;
  closedDeals: number;
  conversionRate: number;
  rank: number;
}

/**
 * Computes agent leaderboard and conversion rates from raw data.
 */
export function computeAgentMetrics(
  agents: any[],
  properties: any[] = [],
  leads: any[] = []
): {
  leaderboard: AgentPerformanceMetric[];
  globalStats: {
    totalAgents: number;
    totalPlatformSales: number;
    avgConversion: number;
    totalProperties: number;
    totalLeads: number;
  };
} {
  const eligibleAgents = (agents || []).filter(
    (u) => (u.role || '').toLowerCase() === 'agent' || u.isAgent === true
  );

  const rawMetrics = (eligibleAgents.length > 0 ? eligibleAgents : agents || []).map((agent) => {
    const assignedAssets = properties.filter((p) => p.assignedAgentId === agent.id).length;
    const agentLeads = leads.filter((l) => l.assignedAgentId === agent.id);
    const activeLeads = agentLeads.length;
    const closedDeals = agentLeads.filter((l) => l.leadStage === 'won').length;
    const conversionRate = activeLeads > 0 ? Math.round((closedDeals / activeLeads) * 100) : 0;
    const totalSales = Number(agent.totalSales || 0);

    return {
      id: agent.id,
      agentName: agent.name || agent.email || 'Unnamed Agent',
      totalSales,
      assignedAssets,
      activeLeads,
      closedDeals,
      conversionRate,
    };
  });

  // Sort descending by totalSales, then conversionRate
  const sorted = rawMetrics.sort((a, b) => b.totalSales - a.totalSales || b.conversionRate - a.conversionRate);

  const leaderboard: AgentPerformanceMetric[] = sorted.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));

  const totalAgents = leaderboard.length;
  const totalPlatformSales = leaderboard.reduce((sum, a) => sum + a.totalSales, 0);
  const avgConversion =
    totalAgents > 0
      ? Math.round(leaderboard.reduce((sum, a) => sum + a.conversionRate, 0) / totalAgents)
      : 0;

  return {
    leaderboard,
    globalStats: {
      totalAgents,
      totalPlatformSales,
      avgConversion,
      totalProperties: properties.length,
      totalLeads: leads.length,
    },
  };
}

/**
 * Formats WhatsApp property brief text.
 */
export function formatWhatsAppPropertyBrief(prop: any, currencySymbol: string = '₹'): string {
  if (!prop) return '';

  const lines: string[] = [];
  lines.push(`🏡 *${prop.title || 'Property Asset'}*`);

  if (prop.propertyId) lines.push(`Asset ID: ${prop.propertyId}`);
  if (prop.type) lines.push(`Type: ${prop.type}`);

  const price = prop.marketPrice || prop.price || 0;
  lines.push(`Price: ${currencySymbol}${Number(price).toLocaleString()}`);

  if (prop.size || prop.area) {
    const unit = prop.areaUnit || 'sq.ft';
    lines.push(`Area/Size: ${prop.size || prop.area} ${unit}`);
  }

  if (prop.facing) lines.push(`Facing: ${prop.facing}`);
  if (prop.village || prop.location) lines.push(`Location: ${prop.village || prop.location}`);
  if (prop.roadType) lines.push(`Road: ${prop.roadType}`);

  if (prop.type === 'Plot') {
    if (prop.front && prop.depth) lines.push(`Dimensions: ${prop.front}ft x ${prop.depth}ft`);
    if (prop.isDiverted !== undefined) lines.push(`Diverted: ${prop.isDiverted ? 'Yes' : 'No'}`);
  }

  if (prop.type === 'Khet' || prop.type === 'Farmhouse') {
    if (prop.soilType) lines.push(`Soil: ${prop.soilType}`);
    if (prop.cropType) lines.push(`Crops: ${prop.cropType}`);
    if (prop.bor) lines.push(`Borewell: ${prop.bor}`);
  }

  if (prop.agentName) lines.push(`Contact Agent: ${prop.agentName}`);

  return lines.join('\n');
}

/**
 * Formats WhatsApp buyer lead brief.
 */
export function formatWhatsAppLeadSummary(lead: any, currencySymbol: string = '₹'): string {
  if (!lead) return '';

  const lines: string[] = [];
  lines.push(`🎯 *Buyer Enquiry: ${lead.name || 'Prospect'}*`);
  if (lead.propertyTypeInterest) lines.push(`Looking for: ${lead.propertyTypeInterest}`);
  if (lead.budgetMax) {
    lines.push(`Budget: Up to ${currencySymbol}${Number(lead.budgetMax).toLocaleString()}`);
  }
  if (lead.location || lead.village) lines.push(`Preferred Location: ${lead.location || lead.village}`);
  if (lead.leadStage) lines.push(`Pipeline Stage: ${lead.leadStage}`);
  if (lead.agentName) lines.push(`Assigned Agent: ${lead.agentName}`);

  return lines.join('\n');
}
