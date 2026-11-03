
import { loyaltyItem, loyaltyDetail } from "./modules/loyalty";
import { growthItem, growthDetail } from "./modules/growth";
import { intelligenceItem, intelligenceDetail } from "./modules/intelligence";
import { backofficeItem, backofficeDetail } from "./modules/backoffice";
import { propertyItem, propertyDetail } from "./modules/property";
import { supportItem, supportDetail } from "./modules/support";
import { solarItem, solarDetail } from "./modules/solar";
import { individualItems } from "./modules/individuals";
import { ModuleDetail, MarketplaceItem } from "./types";

export * from "./types";

export const bundles: MarketplaceItem[] = [
  growthItem,
  loyaltyItem,
  propertyItem,
  intelligenceItem,
  backofficeItem,
  supportItem,
  solarItem
];

export const individuals: MarketplaceItem[] = individualItems;

export const moduleDetailsRegistry: Record<string, ModuleDetail> = {
  [loyaltyDetail.id]: loyaltyDetail,
  [growthDetail.id]: growthDetail,
  [intelligenceDetail.id]: intelligenceDetail,
  [backofficeDetail.id]: backofficeDetail,
  [propertyDetail.id]: propertyDetail,
  [supportDetail.id]: supportDetail,
  [solarDetail.id]: solarDetail
};

export function getModuleDetail(id: string): ModuleDetail | undefined {
  return moduleDetailsRegistry[id];
}
