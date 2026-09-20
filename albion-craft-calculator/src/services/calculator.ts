import {
  AlbionItem,
  City,
  UserCraftSettings,
  CalculationResult,
  MaterialCostDetail,
  PriceRecord,
  JournalTierInfo,
  JournalCalculationDetail
} from '../types/albion';
import { getItemApiId, getMaterialPrice, getProductSellPrice } from './albionApi';

/**
 * Calculate the exact Crafting Fame awarded per 1 craft of an item at a given enchantment level.
 * In Albion Online, equipment crafting fame is determined by the refined resources used:
 * T4: 22.5 per resource (.0), 45 (.1), 90 (.2), 180 (.3), 360 (.4)
 * T5: 90 (.0), 180 (.1), 360 (.2), 720 (.3), 1440 (.4)
 * T6: 270 (.0), 540 (.1), 1080 (.2), 2160 (.3), 4320 (.4)
 * T7: 645 (.0), 1290 (.1), 2580 (.2), 5160 (.3), 10320 (.4)
 * T8: 1395 (.0), 2790 (.1), 5580 (.2), 11160 (.3), 22320 (.4)
 */
export function getItemCraftingFame(item: AlbionItem, enchantment: number): number {
  const encKey = String(enchantment);
  const recipe = item.recipes[encKey] || item.recipes['0'];
  if (!recipe || !recipe.resources) return 0;

  const FAME_PER_RESOURCE: Record<number, Record<number, number>> = {
    4: { 0: 22.5, 1: 45, 2: 90, 3: 180, 4: 360 },
    5: { 0: 90, 1: 180, 2: 360, 3: 720, 4: 1440 },
    6: { 0: 270, 1: 540, 2: 1080, 3: 2160, 4: 4320 },
    7: { 0: 645, 1: 1290, 2: 2580, 3: 5160, 4: 10320 },
    8: { 0: 1395, 1: 2790, 2: 5580, 3: 11160, 4: 22320 },
  };

  let totalFame = 0;
  for (const res of recipe.resources) {
    // Only primary refined resources award journal fame (not artifacts)
    const isPrimary = res.id.includes('PLANKS') || res.id.includes('METALBAR') || 
                      res.id.includes('LEATHER') || res.id.includes('CLOTH') || 
                      res.id.includes('STONEBLOCK');
    if (isPrimary) {
      const famePerUnit = FAME_PER_RESOURCE[item.tier]?.[enchantment] ?? 
                          (22.5 * Math.pow(2, enchantment));
      totalFame += res.count * famePerUnit;
    }
  }

  // Fallback if not calculated from primary resources
  if (totalFame === 0 && item.craftingFame > 0) {
    totalFame = item.craftingFame * Math.pow(2, enchantment);
  }

  return totalFame;
}

/**
 * Check if the item qualifies for city crafting or refining bonus
 */
export function hasCityBonus(item: AlbionItem, city: City, cityBonuses: Record<string, { refining: string[]; crafting: string[] }>): boolean {
  const cityData = cityBonuses[city];
  if (!cityData) return false;

  const sub = (item.subcategory || '').toLowerCase();
  const slot = (item.slot || '').toLowerCase();
  const uname = item.id.toLowerCase();

  if (item.category === 'refining') {
    return cityData.refining.some(r => sub.includes(r) || uname.includes(r));
  }

  return cityData.crafting.some(c => sub.includes(c) || slot.includes(c) || uname.includes(c));
}

/**
 * Calculate Resource Return Rate (RRR) as a fraction (e.g. 0.248 for 24.8%)
 */
export function calculateReturnRate(
  item: AlbionItem,
  settings: UserCraftSettings,
  cityBonuses: Record<string, { refining: string[]; crafting: string[] }>
): number {
  if (settings.customRrr !== null && settings.customRrr >= 0) {
    return Math.min(settings.customRrr / 100, 0.70);
  }

  const hasBonus = hasCityBonus(item, settings.craftCity, cityBonuses);

  // Base production efficiency
  let efficiency = hasBonus ? 0.33 : 0.18;

  // Crafting focus adds 59% efficiency in Albion Online
  if (settings.useFocus) {
    efficiency += 0.59;
  }

  // Daily crafting bonus (10% or 20%)
  if (settings.dailyBonus > 0) {
    efficiency += (settings.dailyBonus / 100);
  }

  // RRR formula: efficiency / (1 + efficiency)
  const rrr = efficiency / (1 + efficiency);
  return Math.min(Math.max(rrr, 0), 0.70);
}

/**
 * Calculate Focus Cost per unit considering Mastery and Spec
 * Formula: BaseFocus * 0.5 ^ ((Mastery*30 + Spec*250) / 10000)
 */
export function calculateFocusCost(
  baseFocus: number,
  masteryLevel: number = 0,
  specLevel: number = 0
): number {
  if (baseFocus <= 0) return 0;
  const masteryBonus = Math.min(Math.max(masteryLevel, 0), 100) * 30;
  const specBonus = Math.min(Math.max(specLevel, 0), 100) * 250;
  const totalEfficiency = (masteryBonus + specBonus) / 10000;
  return Math.round(baseFocus * Math.pow(0.5, totalEfficiency));
}

/**
 * Main Crafting Calculation Function
 */
export function calculateCrafting(
  item: AlbionItem,
  enchantment: number,
  quantity: number,
  settings: UserCraftSettings,
  priceMap: Map<string, PriceRecord[]>,
  customPrices: Record<string, number>,
  cityBonuses: Record<string, { refining: string[]; crafting: string[] }>,
  journalData?: Record<string, Record<string, JournalTierInfo>>,
  quality: number = 1,
  customJournalCount?: number | null
): CalculationResult {
  const encKey = String(enchantment);
  const recipe = item.recipes[encKey] || item.recipes['0'];

  const returnRate = calculateReturnRate(item, settings, cityBonuses);
  const returnRatePercent = Math.round(returnRate * 1000) / 10;
  const effectiveMultiplier = 1 / (1 - returnRate);

  const amountPerCraft = recipe ? recipe.amountCrafted || 1 : 1;
  const amountCraftedTotal = quantity * amountPerCraft;

  // Focus cost
  const baseFocus = recipe ? recipe.focus : 0;
  const focusCostPerUnit = settings.useFocus 
    ? calculateFocusCost(baseFocus, settings.masteryLevel, settings.specLevel)
    : 0;
  const totalFocusUsed = focusCostPerUnit * quantity;

  // Process materials
  const materials: MaterialCostDetail[] = [];
  let grossMaterialsCost = 0;
  let returnedMaterialsValue = 0;
  let inputWeight = 0;

  if (recipe && recipe.resources) {
    for (const res of recipe.resources) {
      const neededGross = res.count * quantity;
      const returnedCount = neededGross * returnRate;
      const netCount = neededGross - returnedCount;

      // Price lookup
      const resPriceRecords = priceMap.get(res.id);
      const customPrice = customPrices[res.id];
      const unitPrice = getMaterialPrice(resPriceRecords, settings.craftCity, settings.buyOrderType, customPrice);

      const totalCost = Math.round(neededGross * unitPrice);
      const retVal = Math.round(returnedCount * unitPrice);

      grossMaterialsCost += totalCost;
      returnedMaterialsValue += retVal;

      // Estimate weight (standard raw/refined resource weight ~0.1 - 0.5 kg)
      inputWeight += neededGross * 0.35;

      materials.push({
        id: res.id,
        name: res.id,
        name_pl: res.id,
        countNeeded: neededGross,
        countReturned: Math.round(returnedCount * 10) / 10,
        netCount: Math.round(netCount * 10) / 10,
        unitPrice,
        totalCost,
        returnedValue: retVal,
        isCustomPrice: customPrice !== undefined
      });
    }
  }

  // Setup fee on materials if buying via Buy Order (2.5%)
  const materialSetupFee = settings.buyOrderType === 'buy_order' 
    ? Math.round(grossMaterialsCost * 0.025)
    : 0;

  const netMaterialsCost = Math.max(0, grossMaterialsCost - returnedMaterialsValue) + materialSetupFee;

  // Crafting Station Tax
  // Tax = ItemValue * 0.1125 * (Fee / 100) per unit
  const nutritionUsedPerUnit = (item.itemValue || 10) * 0.1125;
  const stationTaxPerUnit = (nutritionUsedPerUnit * settings.stationFeePer100Nutrition) / 100;
  const stationTaxTotal = Math.round(stationTaxPerUnit * quantity);

  // Product Selling
  const productApiId = getItemApiId(item, enchantment);
  const productPriceRecords = priceMap.get(productApiId);
  const customProductPrice = customPrices[productApiId];
  const unitSellPrice = getProductSellPrice(
    productPriceRecords,
    settings.sellCity,
    settings.sellOrderType,
    quality,
    customProductPrice
  );

  const grossRevenue = Math.round(unitSellPrice * amountCraftedTotal);

  // Market Taxes on Selling
  // Sales Tax: 4% with premium, 8% without premium
  const salesTaxRate = settings.hasPremium ? 0.04 : 0.08;
  const salesTaxTotal = Math.round(grossRevenue * salesTaxRate);

  // Sell Order Setup Fee: 2.5%
  const setupFeeRate = settings.sellOrderType === 'sell_order' ? 0.025 : 0;
  const setupFeeTotal = Math.round(grossRevenue * setupFeeRate);

  const netRevenue = Math.max(0, grossRevenue - salesTaxTotal - setupFeeTotal);

  // Journals Calculation
  let journalsFilled = 0;
  let journalEmptyCost = 0;
  let journalFullRevenue = 0;
  let journalNetProfit = 0;
  let journalDetail: JournalCalculationDetail | null = null;

  if (item.journalType && journalData && journalData[item.journalType]) {
    const tierKey = `T${Math.max(4, item.tier)}`;
    const jInfo = journalData[item.journalType][tierKey];
    if (jInfo && jInfo.fame > 0) {
      const famePerCraft = getItemCraftingFame(item, enchantment);
      const totalFame = famePerCraft * quantity;
      const fameRequiredPerJournal = jInfo.fame;
      const journalsFilledDecimal = Math.round((totalFame / fameRequiredPerJournal) * 100) / 100;
      const fullJournalsCount = Math.floor(journalsFilledDecimal);
      const partialFame = totalFame % fameRequiredPerJournal;
      const partialPercent = Math.round((partialFame / fameRequiredPerJournal) * 100);

      // Determine actual count used: if customJournalCount provided use that, otherwise default to fullJournalsCount
      const actualCountUsed = customJournalCount !== undefined && customJournalCount !== null
        ? customJournalCount
        : fullJournalsCount;

      const emptyPrice = getMaterialPrice(priceMap.get(jInfo.empty), settings.craftCity, 'direct_buy', customPrices[jInfo.empty]);
      const fullPrice = getProductSellPrice(priceMap.get(jInfo.full), settings.sellCity, settings.sellOrderType, 1, customPrices[jInfo.full]);

      const emptyTotalCost = Math.round(actualCountUsed * emptyPrice);
      const fullGross = Math.round(actualCountUsed * fullPrice);
      const fullNetRevenue = Math.round(fullGross * (1 - salesTaxRate - setupFeeRate));
      const netJournalProfit = fullNetRevenue - emptyTotalCost;

      journalsFilled = journalsFilledDecimal;
      journalEmptyCost = settings.includeJournals ? emptyTotalCost : 0;
      journalFullRevenue = settings.includeJournals ? fullNetRevenue : 0;
      journalNetProfit = netJournalProfit;

      journalDetail = {
        journalType: item.journalType,
        tier: Math.max(4, item.tier),
        emptyId: jInfo.empty,
        fullId: jInfo.full,
        famePerCraft,
        totalFame,
        fameRequiredPerJournal,
        journalsFilledDecimal,
        fullJournalsCount,
        partialPercent,
        partialFame,
        emptyUnitPrice: emptyPrice,
        fullUnitPrice: fullPrice,
        emptyTotalCost,
        fullNetRevenue,
        journalNetProfit: netJournalProfit,
        isCustomEmptyPrice: customPrices[jInfo.empty] !== undefined,
        isCustomFullPrice: customPrices[jInfo.full] !== undefined,
        actualCountUsed
      };
    }
  }

  // Weight
  const outputWeight = Math.round((item.weight || 1) * amountCraftedTotal * 10) / 10;
  inputWeight = Math.round(inputWeight * 10) / 10;

  // Final Profit & Margins
  const totalCost = netMaterialsCost + stationTaxTotal + journalEmptyCost;
  const totalRevenueCombined = netRevenue + journalFullRevenue;
  const netProfit = totalRevenueCombined - totalCost;

  const profitMarginPercent = totalCost > 0 
    ? Math.round((netProfit / totalCost) * 1000) / 10 
    : 0;

  // Silver per focus: compare with zero-focus calculation
  let silverPerFocus = 0;
  if (settings.useFocus && totalFocusUsed > 0) {
    const noFocusSettings = { ...settings, useFocus: false };
    const noFocusReturnRate = calculateReturnRate(item, noFocusSettings, cityBonuses);
    let noFocusReturnedVal = 0;
    if (recipe && recipe.resources) {
      for (const res of recipe.resources) {
        const neededGross = res.count * quantity;
        const retCount = neededGross * noFocusReturnRate;
        const resPriceRecords = priceMap.get(res.id);
        const uPrice = getMaterialPrice(resPriceRecords, settings.craftCity, settings.buyOrderType, customPrices[res.id]);
        noFocusReturnedVal += retCount * uPrice;
      }
    }
    const focusSavedValue = returnedMaterialsValue - noFocusReturnedVal;
    silverPerFocus = Math.round((focusSavedValue / totalFocusUsed) * 100) / 100;
  }

  return {
    item,
    enchantment,
    quality,
    quantity,
    amountCraftedTotal,
    returnRatePercent,
    effectiveMultiplier: Math.round(effectiveMultiplier * 100) / 100,
    focusCostPerUnit,
    totalFocusUsed,
    materials,
    grossMaterialsCost,
    returnedMaterialsValue,
    netMaterialsCost,
    stationTaxTotal,
    salesTaxTotal,
    setupFeeTotal,
    unitSellPrice,
    grossRevenue,
    netRevenue,
    totalCost,
    netProfit,
    profitMarginPercent,
    silverPerFocus,
    inputWeight,
    outputWeight,
    journalsFilled,
    journalEmptyCost,
    journalFullRevenue,
    journalNetProfit,
    journalDetail
  };
}
