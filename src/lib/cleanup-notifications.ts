export type NotificationChannel = 'whatsapp' | 'email';
export type NotificationStage = 'pre_expiry' | 'grace' | 'warning' | 'purge_warning';

export interface NotificationTemplate {
  id: string;
  stage: NotificationStage;
  channel: NotificationChannel;
  title: string;
  description: string;
  subject?: string; // For Email
  body: string;
}

export const LIFECYCLE_NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'pre_expiry_whatsapp',
    stage: 'pre_expiry',
    channel: 'whatsapp',
    title: 'Trial Expiring Soon (WhatsApp)',
    description: 'Sent 1-2 days before trial ends to encourage plan upgrade or trial extension.',
    body: `Namaste {ownerName}! 🙏

Aapke business *{businessName}* ka Biztrix OS trial agle 48 ghanto me expire ho raha hai.

Aapka billing, inventory aur customer ledger poori tarah active aur safe hai. Apne business operations ko uninterrupted chalate rehne ke liye abhi login karein ya +15 din ka trial extend paayein:

👉 *Login & Renew:* {renewUrl}
📞 *Direct Support:* {supportPhone}

Dhanyawad,
Biztrix Platform Team`,
  },
  {
    id: 'grace_whatsapp',
    stage: 'grace',
    channel: 'whatsapp',
    title: 'Grace Period Alert (WhatsApp)',
    description: 'Sent 1-14 days after trial expired offering friendly help and +15 days free extension.',
    body: `Namaste {ownerName}! 🙏

Aapke business *{businessName}* ka trial {daysStale} din pehle expire ho gaya tha.

Kya aapko software setup ya GST billing me koi dikkat aa rahi hai? Hum aapki madad ke liye tayyar hain!

Special privilege ke taur par humne aapke liye *+15 Dino ka Extra Free Trial* unlock kar diya hai. Abhi claim karein:

👉 *Reactivate Now:* {renewUrl}
📞 *WhatsApp Support:* {supportPhone}

Hum aapke business growth ke sath hain!
Biztrix Team`,
  },
  {
    id: 'warning_whatsapp',
    stage: 'warning',
    channel: 'whatsapp',
    title: 'Stale Re-engagement (WhatsApp)',
    description: 'Sent 15-45 days after inactivity highlighting safe data and special renewal offer.',
    body: `Namaste {ownerName}!

Aapke *{businessName}* ka account pichle {daysStale} dino se inactive hai. 

Aapka purana POS records, customers ledger aur GST invoices hamare cloud me bilkul safe hain. Agar aap apna business restart karna chahte hain, toh abhi login karke apna plan continue karein:

👉 *Reactivate Account:* {renewUrl}
🎁 *Special Offer:* Annual plan par 20% discount ke liye hume yahan reply karein!

Biztrix Customer Success Team`,
  },
  {
    id: 'purge_whatsapp',
    stage: 'purge_warning',
    channel: 'whatsapp',
    title: 'Urgent: Pre-Purge Final Notice (WhatsApp)',
    description: 'Sent 45+ days after inactivity warning of upcoming permanent data purge.',
    body: `⚠️ *URGENT NOTICE: Database Cleanup Warning*

Namaste {ownerName},

Aapke business *{businessName}* ka account pichle *{daysStale} dino* se expired aur inactive hai.

Database hygiene aur data protection policy ke tehat, agle *7 dino* me aapka inactive store data aur subcollections permanent purge queue me transfer ho jayenge.

Apna data surakshit rakhne ya account reactivate karne ke liye kripya turant login karein:

👉 *Protect My Account:* {renewUrl}
📞 *Urgent Help:* {supportPhone}

Yadi aap is account ko band karna chahte hain, toh aap is sandesh ko ignore kar sakte hain.
Biztrix Platform Compliance`,
  },
  {
    id: 'pre_expiry_email',
    stage: 'pre_expiry',
    channel: 'email',
    title: 'Trial Expiring Soon (Email)',
    description: 'Formal email notification 1-2 days before trial expiry.',
    subject: 'Action Required: Your Biztrix trial for {businessName} expires soon',
    body: `Dear {ownerName},

Your free trial for {businessName} on Biztrix Intelligent Business OS will conclude in 48 hours.

All your business records, GST invoices, inventory catalogs, and customer ledgers are safe. To maintain uninterrupted operational access for your billing counters and staff, please renew your subscription or claim an extension:

Reactivate & Manage Plan:
{renewUrl}

Need assistance? Reply directly to this email or contact support at {supportPhone}.

Warm regards,
Biztrix Operations Team`,
  },
  {
    id: 'grace_email',
    stage: 'grace',
    channel: 'email',
    title: 'Grace Period Extension (Email)',
    description: 'Formal email notification offering +15 days extension.',
    subject: 'We miss you! Special 15-Day trial extension for {businessName}',
    body: `Dear {ownerName},

Your Biztrix trial for {businessName} ended {daysStale} days ago. 

We would love to ensure you had ample time to explore our POS billing, GST filing, and inventory management capabilities. As a courtesy, you can instantly resume operations with a 15-day complimentary extension:

Resume Your Business OS:
{renewUrl}

If you need a 1-on-1 walkthrough with an onboarding specialist, simply reply to this email.

Best regards,
Biztrix Customer Success`,
  },
  {
    id: 'warning_email',
    stage: 'warning',
    channel: 'email',
    title: 'Account Re-engagement (Email)',
    description: 'Re-engagement email for businesses inactive 15-45 days.',
    subject: 'Important: Your {businessName} records on Biztrix are awaiting reactivation',
    body: `Dear {ownerName},

We noticed that {businessName} has been inactive for {daysStale} days.

Your customer contacts, sales history, and product catalogs remain securely stored in our cloud. You can easily pick up right where you left off by reactivating your workspace:

Access Your Workspace:
{renewUrl}

Looking for a tailored plan for your organization? Reply to this message and our team will assist you with customized volume pricing.

Warm regards,
Biztrix Enterprise Team`,
  },
  {
    id: 'purge_email',
    stage: 'purge_warning',
    channel: 'email',
    title: 'Final Notice: Database Purge Scheduled (Email)',
    description: 'Urgent email warning of upcoming permanent data deletion.',
    subject: 'FINAL NOTICE: Scheduled data purge for inactive account {businessName}',
    body: `URGENT NOTICE: Database Cleanup Policy Notification

Dear {ownerName},

This is an automated administrative notification regarding your account {businessName}.

Your account has been inactive for {daysStale} days. In accordance with platform data retention policies, inactive trial databases exceeding 60 days of inactivity are queued for permanent deletion.

To safeguard your data or reactivate your subscription, please log in immediately:

Reactivate Account & Retain Data:
{renewUrl}

If no action is taken within the next 7 business days, your business subcollections and records will be permanently purged and cannot be recovered.

For immediate support, contact {supportPhone}.

Sincerely,
Biztrix Security & Compliance Desk`,
  },
];

/**
 * Normalizes an Indian or International phone number for WhatsApp wa.me.
 */
export function cleanWhatsAppPhone(phone?: string | null): string {
  if (!phone) return '';
  let clean = String(phone).replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = clean.substring(1);
  }
  if (clean.length === 10) {
    clean = `91${clean}`;
  }
  return clean;
}

/**
 * Renders template body/subject with provided variable substitutions.
 */
export function renderNotificationText(
  templateText: string,
  variables: Record<string, string | number>
): string {
  let result = templateText;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, String(value ?? ''));
  }
  return result;
}

/**
 * Builds direct 1-click WhatsApp link (wa.me) with pre-filled encoded text.
 */
export function buildWhatsAppDirectUrl(phone: string, text: string): string {
  const clean = cleanWhatsAppPhone(phone);
  if (!clean) return '';
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

/**
 * Builds direct 1-click mailto: URL with subject and body.
 */
export function buildMailtoUrl(email: string, subject: string, body: string): string {
  const cleanEmail = String(email || '').trim();
  if (!cleanEmail) return '';
  return `mailto:${cleanEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Checks if a tenant is currently on cooldown (e.g. notified within the last 7 days).
 */
export function isNotificationOnCooldown(
  lastNotifiedAt?: string | null,
  cooldownDays: number = 7
): {
  onCooldown: boolean;
  daysAgo: number | null;
  daysRemaining: number;
} {
  if (!lastNotifiedAt) {
    return { onCooldown: false, daysAgo: null, daysRemaining: 0 };
  }

  const lastTime = new Date(lastNotifiedAt).getTime();
  if (isNaN(lastTime)) {
    return { onCooldown: false, daysAgo: null, daysRemaining: 0 };
  }

  const now = Date.now();
  const diffDays = Math.floor((now - lastTime) / (86400 * 1000));

  if (diffDays < cooldownDays) {
    return {
      onCooldown: true,
      daysAgo: diffDays,
      daysRemaining: cooldownDays - diffDays,
    };
  }

  return {
    onCooldown: false,
    daysAgo: diffDays,
    daysRemaining: 0,
  };
}

/**
 * Selects the most appropriate notification stage based on days expired / days stale.
 */
export function resolveRecommendedNotificationStage(
  status: string,
  daysExpired: number
): NotificationStage {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'pro' || normalized === 'active_pro') {
    return 'pre_expiry';
  }
  if (daysExpired <= 0) {
    return 'pre_expiry';
  }
  if (daysExpired <= 14) {
    return 'grace';
  }
  if (daysExpired < 50) {
    return 'warning';
  }
  return 'purge_warning';
}
