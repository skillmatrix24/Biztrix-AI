import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIFECYCLE_NOTIFICATION_TEMPLATES,
  cleanWhatsAppPhone,
  renderNotificationText,
  buildWhatsAppDirectUrl,
  buildMailtoUrl,
  isNotificationOnCooldown,
  resolveRecommendedNotificationStage,
} from './cleanup-notifications';

test('LIFECYCLE_NOTIFICATION_TEMPLATES contains valid WhatsApp and Email templates for all stages', () => {
  assert.ok(LIFECYCLE_NOTIFICATION_TEMPLATES.length >= 8);

  const stages = ['pre_expiry', 'grace', 'warning', 'purge_warning'];
  for (const stage of stages) {
    const wa = LIFECYCLE_NOTIFICATION_TEMPLATES.find((t) => t.stage === stage && t.channel === 'whatsapp');
    assert.ok(wa, `Missing WhatsApp template for stage: ${stage}`);
    assert.ok(wa.body.includes('{businessName}'));

    const em = LIFECYCLE_NOTIFICATION_TEMPLATES.find((t) => t.stage === stage && t.channel === 'email');
    assert.ok(em, `Missing Email template for stage: ${stage}`);
    assert.ok(em.subject && em.subject.length > 5);
    assert.ok(em.body.includes('{businessName}'));
  }
});

test('cleanWhatsAppPhone normalizes 10-digit, 0-prefixed, and international numbers', () => {
  assert.equal(cleanWhatsAppPhone('9876543210'), '919876543210');
  assert.equal(cleanWhatsAppPhone('09876543210'), '919876543210');
  assert.equal(cleanWhatsAppPhone('+91 98765 43210'), '919876543210');
  assert.equal(cleanWhatsAppPhone('14155552671'), '14155552671');
  assert.equal(cleanWhatsAppPhone(null), '');
  assert.equal(cleanWhatsAppPhone(''), '');
});

test('renderNotificationText replaces variables and handles missing keys gracefully', () => {
  const template = 'Namaste {ownerName}, {businessName} expired {daysStale} days ago. Visit {renewUrl}';
  const rendered = renderNotificationText(template, {
    ownerName: 'Sunil Sharma',
    businessName: 'Sharma Electronics',
    daysStale: 12,
    renewUrl: 'https://biztrix.com/pricing',
  });

  assert.equal(
    rendered,
    'Namaste Sunil Sharma, Sharma Electronics expired 12 days ago. Visit https://biztrix.com/pricing'
  );
  assert.equal(rendered.includes('{'), false);
});

test('buildWhatsAppDirectUrl and buildMailtoUrl create compliant, encoded deep links', () => {
  const waUrl = buildWhatsAppDirectUrl('9876543210', 'Namaste Sharma ji! Aapka account expire ho gaya.');
  assert.ok(waUrl.startsWith('https://wa.me/919876543210?text='));
  assert.ok(waUrl.includes('Namaste%20Sharma'));

  const mailUrl = buildMailtoUrl('sunil@example.com', 'Renewal Notice', 'Hello Sunil,\nRenew now.');
  assert.ok(mailUrl.startsWith('mailto:sunil@example.com?subject=Renewal%20Notice&body=Hello%20Sunil'));
});

test('isNotificationOnCooldown computes cooldown, days ago, and remaining days correctly', () => {
  const now = Date.now();
  const twoDaysAgo = new Date(now - 2 * 86400 * 1000).toISOString();
  const eightDaysAgo = new Date(now - 8 * 86400 * 1000).toISOString();

  const activeCooldown = isNotificationOnCooldown(twoDaysAgo, 7);
  assert.equal(activeCooldown.onCooldown, true);
  assert.equal(activeCooldown.daysAgo, 2);
  assert.equal(activeCooldown.daysRemaining, 5);

  const expiredCooldown = isNotificationOnCooldown(eightDaysAgo, 7);
  assert.equal(expiredCooldown.onCooldown, false);
  assert.equal(expiredCooldown.daysAgo, 8);
  assert.equal(expiredCooldown.daysRemaining, 0);

  const neverNotified = isNotificationOnCooldown(null, 7);
  assert.equal(neverNotified.onCooldown, false);
  assert.equal(neverNotified.daysAgo, null);
});

test('resolveRecommendedNotificationStage classifies stages across expiry thresholds', () => {
  assert.equal(resolveRecommendedNotificationStage('pro', 0), 'pre_expiry');
  assert.equal(resolveRecommendedNotificationStage('trial', 0), 'pre_expiry');
  assert.equal(resolveRecommendedNotificationStage('trial', 8), 'grace');
  assert.equal(resolveRecommendedNotificationStage('trial', 30), 'warning');
  assert.equal(resolveRecommendedNotificationStage('trial', 65), 'purge_warning');
});
