# Vendor Command: Advanced Supply Chain Analytics

This project enhances the existing vendor management system into a robust supply chain command center with high-fidelity analytics and precision filtering capabilities.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following plan prioritizes enhanced search/filtering and analytical insights as requested.

- **Confirmed Decision**: Advanced search and filtering implemented via a new modular filter bar.
- **Confirmed Decision**: Analytics dashboard added with Payment Trends and Top Supplier Analysis.
- **Recommended Default**: Dashboard data will be calculated on the client-side based on real-time Firestore subscriptions for performance.

### 1. Overview & Core Concept

- **What It Does**: Provides a dedicated, analytical interface for managing vendor relations, tracking payment obligations, and auditing purchasing trends.
- **Target Audience**: Business owners, procurement managers, and finance teams managing complex supply chain interactions.
- **Key Value**: Enables data-driven procurement decisions, faster vendor reconciliation, and proactive debt management.

### 2. User Experience & Visual Design

- **Key User Flows**:
    - User lands on the Vendors Page, immediately viewing the aggregate dashboard (Total Payable, Sourcing Volume, Pending Dues).
    - User applies multi-dimensional filters (Status, Location, Date, Balance) to drill down into specific vendor segments.
    - User clicks on top-performing or high-debt suppliers for detailed ledger inspection.
- **Visual Identity & Theme**:
    - *Aesthetic*: Utilitarian, data-dense, yet clean and accessible.
    - *Palette*: Crisp white background, subtle slate grays, primary blue accents, and semantic status colors (Green/Amber/Crimson) for financial alerts.
    - *Components*: Uses `shadcn/ui` components (Table, Card, Select, Input, Popover).
- **Interactive Feedback & Motion**: Smooth transition for filter application, skeleton loaders for data fetching, responsive table layout for mobile scanning.

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Client-Side Data Aggregation for Analytics**
    - *Approach*: Perform analytics calculations (trends, top suppliers) using client-side `useMemo` on the synchronized vendor list and cashbook data.
    - *Why*: Reduces Firestore read costs while providing near-instant UI responses for a typical small-to-mid-sized business dataset.
- **Decision 2: Modular Filter Design**
    - *Approach*: Implement a collapsible filter sidebar for desktop and a bottom sheet or expanded modal for mobile.
    - *Why*: Balances desktop screen real estate with mobile usability constraints.

### 4. Technical Architecture & Data Strategy

```text
┌────────────────────────────────────────────────────────┐
│             Vendors Page (Server Component)            │
└──────────────┬─────────────────────────────────────────┘
               │ (Real-time Firebase Hook)
┌──────────────▼─────────────────────────────────────────┐
│               Vendor/Cashbook Data Store               │
└──────────────┬─────────────────────────────────────────┘
               │
┌──────────────▼─────────────────────────────────────────┐
│               Analytics Aggregator Engine              │
│       (Aggregates Payment Trends/Supplier Ranking)     │
└──────────────┬─────────────────────────────────────────┘
               │
┌──────────────┼─────────────────────────────────────────┐
│              │                 │                       │
┌──────────────▼───┐  ┌──────────▼──────────┐  ┌─────────▼───────┐
│ Dashboard Grid   │  │ Filter/Search Bar   │  │ Vendor Table    │
│ (Recharts Charts)│  │ (Module State)      │  │ (Filtered Data) │
└──────────────────┘  └─────────────────────┘  └─────────────────┘
```

- **Data Model & State**: Utilizes the `businesses/{businessId}/vendors` and `businesses/{businessId}/cashbook` collections.
- **Filtering Logic**: 
  - `filteredVendors`: Composed of a memoized chain of filters: `SearchTerm` -> `StatusFilter` -> `LocationFilter` -> `BalanceRangeFilter`.
- **Analytics Logic**:
  - `PaymentTrends`: Aggregates `cashbook` entries by `month/date`.
  - `TopSuppliers`: Aggregates `vendors` by `totalPurchase`.
