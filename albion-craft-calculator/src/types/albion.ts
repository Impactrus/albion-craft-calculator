export type ServerRegion = 'europe' | 'west' | 'east';

export type City = 
  | 'Caerleon' 
  | 'Bridgewatch' 
  | 'Fort Sterling' 
  | 'Lymhurst' 
  | 'Martlock' 
  | 'Thetford' 
  | 'Brecilien' 
  | 'Black Market';

export type Language = 'pl' | 'en';

export interface CraftResource {
  id: string;
  count: number;
  enchantment: number;
}

export interface CraftRecipe {
  silver: number;
  amountCrafted: number;
  focus: number;
  time: number;
  resources: CraftResource[];
}

export interface AlbionItem {
  id: string;
  name: string;
  name_pl: string;
  tier: number;
  category: string;
  subcategory: string;
  slot: string;
  itemValue: number;
  craftingFame: number;
  weight: number;
  journalType?: string | null;
  apiPattern: 'equipment' | 'refining';
  recipes: Record<string, CraftRecipe>;
}

export interface JournalTierInfo {
  empty: string;
  full: string;
  fame: number;
}

export interface AlbionDataStructure {
  version: string;
  itemCount: number;
  cityBonuses: Record<string, { refining: string[]; crafting: string[] }>;
  journals: Record<string, Record<string, JournalTierInfo>>;
  items: AlbionItem[];
}

export interface PriceRecord {
  item_id: string;
  city: string;
  quality: number;
  sell_price_min: number;
  sell_price_min_date: string;
  sell_price_max: number;
  sell_price_max_date: string;
  buy_price_min: number;
  buy_price_min_date: string;
  buy_price_max: number;
  buy_price_max_date: string;
}

export interface CapturedMarketOrder {
  item_id: string;
  city: string;
  quality: number;
  auction_type: 'offer' | 'request';
  price: number;
  amount: number;
  timestamp: string;
}

export interface UserCraftSettings {
  server: ServerRegion;
  craftCity: City;
  sellCity: City;
  hasPremium: boolean;
  useFocus: boolean;
  stationFeePer100Nutrition: number;
  masteryLevel: number;
  specLevel: number;
  dailyBonus: number;
  includeJournals: boolean;
  sellOrderType: 'sell_order' | 'direct_sell';
  buyOrderType: 'buy_order' | 'direct_buy';
  customRrr: number | null;
}

export interface MaterialCostDetail {
  id: string;
  name: string;
  name_pl: string;
  countNeeded: number;
  countReturned: number;
  netCount: number;
  unitPrice: number;
  totalCost: number;
  returnedValue: number;
  isCustomPrice?: boolean;
}

export interface JournalCalculationDetail {
  journalType: string;
  tier: number;
  emptyId: string;
  fullId: string;
  famePerCraft: number;
  totalFame: number;
  fameRequiredPerJournal: number;
  journalsFilledDecimal: number;
  fullJournalsCount: number;
  partialPercent: number;
  partialFame: number;
  emptyUnitPrice: number;
  fullUnitPrice: number;
  emptyTotalCost: number;
  fullNetRevenue: number;
  journalNetProfit: number;
  isCustomEmptyPrice: boolean;
  isCustomFullPrice: boolean;
  actualCountUsed: number;
}

export interface CalculationResult {
  item: AlbionItem;
  enchantment: number;
  quality: number;
  quantity: number;
  amountCraftedTotal: number;
  returnRatePercent: number;
  effectiveMultiplier: number;
  focusCostPerUnit: number;
  totalFocusUsed: number;
  materials: MaterialCostDetail[];
  grossMaterialsCost: number;
  returnedMaterialsValue: number;
  netMaterialsCost: number;
  stationTaxTotal: number;
  salesTaxTotal: number;
  setupFeeTotal: number;
  unitSellPrice: number;
  grossRevenue: number;
  netRevenue: number;
  totalCost: number;
  netProfit: number;
  profitMarginPercent: number;
  silverPerFocus: number;
  inputWeight: number;
  outputWeight: number;
  journalsFilled: number;
  journalEmptyCost: number;
  journalFullRevenue: number;
  journalNetProfit: number;
  journalDetail?: JournalCalculationDetail | null;
}

export interface PriceDatabaseMetadata {
  totalItems: number;
  lastSaved: string;
  dbFile: string;
}
