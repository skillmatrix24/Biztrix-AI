
import { ModuleDetail, MarketplaceItem } from "../types";

export const propertyItem: MarketplaceItem = { 
  id: 'suite_property', 
  name: 'Property Pro Suite', 
  description: 'Property Catalog, Site-Visits & Agent Performance.', 
  price: '1499', 
  icon: 'Building', 
  category: 'Bundles', 
  isPopular: false, 
  isTrialAvailable: true,
  inclusions: "Technical Catalog, Agent Matrix, Site-Visit Log, Maps"
};

export const propertyDetail: ModuleDetail = {
  id: 'suite_property',
  title: "Property Pro Suite",
  logicTitle: "Real Estate Asset Matrix",
  description: "Specialized catalog and lead management for the property sector.",
  features: [
    "Technical Asset Catalog (Facing, Road, Soil, Crop)",
    "Lead Site-Visit Scheduling & Feedback Log",
    "Agent Commission & Performance Matrix",
    "Map Integrated Listings for field teams",
    "Public Property Portals with lead capture"
  ],
  rules: [
    "Data Masking: Contact details hidden from unauthorized agents.",
    "Lead Ownership: Hard-binding of leads to acquiring agents.",
    "Hierarchy Control: Managers can override agent assignments."
  ],
  backend: "Dynamic schema support for diverse property types (Plot, Khet, Building)."
};
