
export type ModuleSection = {
  title: string;
  icon: string;
  desc: string;
};

export type ModuleDetail = {
  id: string;
  title: string;
  logicTitle: string;
  description: string;
  sections?: ModuleSection[];
  features?: string[];
  rules: string[];
  backend: string;
  guideVideoUrl?: string;
  guideImages?: string[];
};

export type MarketplaceItem = {
  id: string;
  name: string;
  description: string;
  price: string;
  icon: string;
  category: string;
  isPopular?: boolean;
  isTrialAvailable: boolean;
  inclusions: string;
  isActive?: boolean;
};
