import test from 'node:test';
import assert from 'node:assert/strict';
import {
  convertAreaUnits,
  calculatePropertyPrice,
  maskClientName,
  maskClientPhone,
  computeAgentMetrics,
  formatWhatsAppPropertyBrief,
  formatWhatsAppLeadSummary,
} from './real-estate';

test('Real Estate: Area Unit Conversions', () => {
  // 1 Acre = 43,560 sq.ft
  assert.equal(convertAreaUnits(1, 'Acre', 'sq.ft'), 43560);
  assert.equal(convertAreaUnits(43560, 'sq.ft', 'Acre'), 1);

  // 1 Guntha = 1,089 sq.ft
  assert.equal(convertAreaUnits(1, 'Guntha', 'sq.ft'), 1089);
  assert.equal(convertAreaUnits(1089, 'sq.ft', 'Guntha'), 1);

  // 1 Acre = 40 Gunthas (43560 / 1089 = 40)
  assert.equal(convertAreaUnits(1, 'Acre', 'Guntha'), 40);

  // 1 sq.yd = 9 sq.ft
  assert.equal(convertAreaUnits(100, 'sq.yd', 'sq.ft'), 900);
  assert.equal(convertAreaUnits(900, 'sq.ft', 'sq.yd'), 100);

  // Identity conversion
  assert.equal(convertAreaUnits(50, 'Acre', 'Acre'), 50);

  // Negative / zero handles gracefully
  assert.equal(convertAreaUnits(0, 'Acre', 'sq.ft'), 0);
  assert.equal(convertAreaUnits(-5, 'sq.ft', 'Acre'), 0);
});

test('Real Estate: Pricing Calculations for Different Asset Types', () => {
  // Khet / Agricultural: Rate * Size (e.g. 5 Acres at 1,500,000 / Acre)
  const khetPricing = calculatePropertyPrice('Khet', 1500000, 5, 1200000);
  assert.equal(khetPricing.marketPrice, 7500000);
  assert.equal(khetPricing.companyPrice, 6000000);
  assert.equal(khetPricing.margin, 1500000);
  assert.equal(khetPricing.ratePerUnit, 1500000);

  // Plot / Residential: Rate * Area (e.g. 1500 sq.ft at 1200 / sq.ft)
  const plotPricing = calculatePropertyPrice('Plot', 1200, 1500, 1000);
  assert.equal(plotPricing.marketPrice, 1800000);
  assert.equal(plotPricing.companyPrice, 1500000);
  assert.equal(plotPricing.margin, 300000);
  assert.equal(plotPricing.ratePerUnit, 1200);

  // Fixed Asset (Building / Flat): Lumpsum Rate
  const buildingPricing = calculatePropertyPrice('Building', 4500000, 1, 4000000);
  assert.equal(buildingPricing.marketPrice, 4500000);
  assert.equal(buildingPricing.companyPrice, 4000000);
  assert.equal(buildingPricing.margin, 500000);
});

test('Real Estate: Buyer Privacy Masking for Lead Protection', () => {
  // Name masking
  assert.equal(maskClientName('Rahul Sharma'), 'R***a');
  assert.equal(maskClientName('Amit Patel'), 'A***l');
  assert.equal(maskClientName('Om'), 'O*');
  assert.equal(maskClientName(''), 'Confidential Client');

  // Phone masking
  assert.equal(maskClientPhone('+919876543210'), '98******10');
  assert.equal(maskClientPhone('9876543210'), '98******10');
  assert.equal(maskClientPhone(''), 'Protected');
});

test('Real Estate: Agent Performance Metrics & Leaderboard Ranking', () => {
  const agents = [
    { id: 'agent_1', name: 'Ramesh Verma', role: 'agent', totalSales: 5000000 },
    { id: 'agent_2', name: 'Suresh Kumar', role: 'agent', totalSales: 12000000 },
    { id: 'agent_3', name: 'Pooja Tiwari', role: 'agent', totalSales: 8000000 },
  ];

  const properties = [
    { id: 'p1', assignedAgentId: 'agent_1' },
    { id: 'p2', assignedAgentId: 'agent_2' },
    { id: 'p3', assignedAgentId: 'agent_2' },
    { id: 'p4', assignedAgentId: 'agent_3' },
  ];

  const leads = [
    { id: 'l1', assignedAgentId: 'agent_2', leadStage: 'won' },
    { id: 'l2', assignedAgentId: 'agent_2', leadStage: 'won' },
    { id: 'l3', assignedAgentId: 'agent_2', leadStage: 'contacted' },
    { id: 'l4', assignedAgentId: 'agent_2', leadStage: 'site-visit' },
    { id: 'l5', assignedAgentId: 'agent_1', leadStage: 'won' },
    { id: 'l6', assignedAgentId: 'agent_1', leadStage: 'new' },
    { id: 'l7', assignedAgentId: 'agent_3', leadStage: 'new' },
  ];

  const { leaderboard, globalStats } = computeAgentMetrics(agents, properties, leads);

  assert.equal(globalStats.totalAgents, 3);
  assert.equal(globalStats.totalPlatformSales, 25000000);
  assert.equal(globalStats.totalProperties, 4);
  assert.equal(globalStats.totalLeads, 7);

  // Leaderboard ranking by totalSales
  assert.equal(leaderboard[0].id, 'agent_2'); // 12,000,000
  assert.equal(leaderboard[0].rank, 1);
  assert.equal(leaderboard[0].assignedAssets, 2);
  assert.equal(leaderboard[0].activeLeads, 4);
  assert.equal(leaderboard[0].closedDeals, 2);
  assert.equal(leaderboard[0].conversionRate, 50); // 2 out of 4 = 50%

  assert.equal(leaderboard[1].id, 'agent_3'); // 8,000,000
  assert.equal(leaderboard[1].rank, 2);

  assert.equal(leaderboard[2].id, 'agent_1'); // 5,000,000
  assert.equal(leaderboard[2].rank, 3);
  assert.equal(leaderboard[2].conversionRate, 50); // 1 out of 2 = 50%
});

test('Real Estate: WhatsApp Message Generators', () => {
  const plot = {
    title: 'Green Valley Plot #42',
    propertyId: 'PROP-102938',
    type: 'Plot',
    marketPrice: 2500000,
    area: 2000,
    areaUnit: 'sq.ft',
    facing: 'North-East',
    front: '40',
    depth: '50',
    isDiverted: true,
    location: 'Bypass Road, Raipur',
    agentName: 'Suresh Kumar',
  };

  const text = formatWhatsAppPropertyBrief(plot, '₹');
  assert.match(text, /Green Valley Plot #42/);
  assert.match(text, /PROP-102938/);
  assert.match(text, /₹2,500,000/);
  assert.match(text, /2000 sq\.ft/);
  assert.match(text, /40ft x 50ft/);
  assert.match(text, /Diverted: Yes/);

  const lead = {
    name: 'Vikram Singh',
    propertyTypeInterest: 'Khet',
    budgetMax: 5000000,
    location: 'Dhamtari',
    leadStage: 'site-visit',
    agentName: 'Ramesh Verma',
  };

  const leadText = formatWhatsAppLeadSummary(lead, '₹');
  assert.match(leadText, /Vikram Singh/);
  assert.match(leadText, /Khet/);
  assert.match(leadText, /₹5,000,000/);
  assert.match(leadText, /site-visit/);
});
