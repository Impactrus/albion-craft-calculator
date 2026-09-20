import {
  AlbionItem,
  City,
  UserCraftSettings,
  CalculationResult,
  MaterialCostDetail,
  PriceRecord,
  JournalTierInfo
} from '../types/albion';
import { getItemApiId, getMaterialPrice, getProductSellPrice } from './albionApi';

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
  quality: number = 1
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

  if (settings.includeJournals && item.journalType && journalData && journalData[item.journalType]) {
    const tierKey = `T${item.tier}`;
    const jInfo = journalData[item.journalType][tierKey];
    if (jInfo && jInfo.fame > 0 && item.craftingFame > 0) {
      const totalFame = item.craftingFame * quantity;
      journalsFilled = Math.round((totalFame / jInfo.fame) * 10) / 10;

      const emptyPrice = getMaterialPrice(priceMap.get(jInfo.empty), settings.craftCity, 'direct_buy', customPrices[jInfo.empty]);
      const fullPrice = getProductSellPrice(priceMap.get(jInfo.full), settings.sellCity, settings.sellOrderType, 1, customPrices[jInfo.full]);

      journalEmptyCost = Math.round(journalsFilled * emptyPrice);
      const fullGross = Math.round(journalsFilled * fullPrice);
      journalFullRevenue = Math.round(fullGross * (1 - salesTaxRate - setupFeeRate));
      journalNetProfit = Math.max(0, journalFullRevenue - journalEmptyCost);
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
    journalNetProfit
  };
}
