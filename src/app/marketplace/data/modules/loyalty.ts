
import { ModuleDetail, MarketplaceItem } from "../types";

export const loyaltyItem: MarketplaceItem = { 
  id: 'suite_loyalty', 
  name: 'Loyalty & Membership Suite', 
  description: 'Reward Engine, Digital Cards & Cashback Wallets.', 
  price: '899', 
  icon: 'Ticket', 
  category: 'Bundles', 
  isPopular: true, 
  isTrialAvailable: true,
  inclusions: "Hybrid Stacking, Reference Hub, Digital Cards, QR Hub"
};

export const loyaltyDetail: ModuleDetail = {
  id: 'suite_loyalty',
  title: "Loyalty & Membership Suite",
  logicTitle: "Hybrid Reward Protocol v3.5",
  description: "Enterprise-grade customer retention engine with automated reward logic and unified identity nodes mapped to the 10-digit mobile network.",
  sections: [
    {
      title: "Loyalty Command",
      icon: "LayoutDashboard",
      desc: "Aapka central intelligence node jahan real-time analytics dikhte hain. Isme 'Retention Score', 'Churn Radar', aur 'Revenue Contribution' track hota hai. AI Advisor yahan se data pick karke aapko sateek (precise) campaign strategies suggest karta hai."
    },
    {
      title: "Track Member Portal",
      icon: "SearchCode",
      desc: "Customers ke liye ek secure, white-labelled public portal. Member apna mobile number daal kar OTP verify karte hain aur apna digital QR code, live reward points, cashback balance aur personalised offers dekh sakte hain. Isse trust aur transparency 100% rehti hai."
    },
    {
      title: "Offer & Reward Hub",
      icon: "Ticket",
      desc: "Isme advanced coupon logic engine hai jo 'Hybrid Stacking' aur optional 'Daily Node Protection' support karta hai. Aap aise cards bana sakte hain jo ya toh exclusive hon (Main Offers) ya stackable hon (Welcome/Referral bonus), jisse pricing hamesha controlled rehti hai."
    },
    {
      title: "Reference Registry",
      icon: "Handshake",
      desc: "External partners (Agents, MDs, Owners) ko manage karne ka hub. Inhe 'Gifted' memberships ke waqt automatically notify kiya ja sakta hai. Isme Meta template variable mapping guide bhi shamil hai taaki communication hamesha professional rahe."
    },
    {
      title: "Member Registry",
      icon: "Users",
      desc: "Unified customer database jahan har profile ek mobile node se linked hai. Isme aap har member ki visit frequency, average order value, aur lifetime spend (LTV) ka sateek audit kar sakte hain. Duplicate identities yahan automatically merge ho jati hain."
    },
    {
      title: "Automation Rules",
      icon: "Zap",
      desc: "Aapka silent sales team. Ye module customer ke lifecycle events jaise 'Birthday', 'Anniversary', 'Points Milestone' ya '30 Days Inactivity' par automatically WhatsApp messages aur reward cards dispatch kar deta hai bina kisi manual intervention ke."
    }
  ],
  features: [
    "Hybrid Stacking Protocol (Exclusive vs Stackable Logic)",
    "Optional Daily Node Protection (System reset at 01:30 AM)",
    "OTP-Verified Public Tracking Portals",
    "Variable Mapping Guide for Meta Templates",
    "Gift Node Onboarding with Reference Alerts",
    "Automated Birthday & Anniversary Nudges",
    "Cashback Wallet with Atomic Sync",
    "Points-to-Cash Conversion Engine"
  ],
  rules: [
    "Hybrid Stacking Node: Hamesha sirf EK 'Exclusive' card hi apply hoga, lekin unlimited 'Stackable' cards add kiye ja sakte hain.",
    "Daily Node Protection (Optional): On karne par ek member ek hi business day (1:30 AM reset cycle) mein sirf ek 'Exclusive' reward node consume kar sakta hai.",
    "Unified Identity: All member IDs strictly 10-digit verified mobile number se linked hain taaki data consistency bani rahe.",
    "Reference Mapping: Gifted memberships ke liye variable protocol ({{1}} to {{5}}) ka istemal karke partners ko sateek details bheji jati hain.",
    "Atomic Balance: Wallet aur Points hamesha transactional safety (Firestore Transactions) ke saath update hote hain taaki accounting error zero rahe."
  ],
  backend: "Uses specialized server-side triggers for 1:30 AM day-reset and high-speed Firestore listeners for real-time balance updates. API node is Meta Cloud v21.0 compliant for all automated dispatches."
};
