import { ServerRegion, City, PriceRecord, AlbionItem } from '../types/albion';

export function getItemApiId(item: AlbionItem, enchantment: number): string {
  if (enchantment === 0) {
    return item.id;
  }
  if (item.apiPattern === 'refining') {
    return `${item.id}_LEVEL${enchantment}@${enchantment}`;
  }
  return `${item.id}@${enchantment}`;
}

export function getItemRenderUrl(itemId: string, quality: number = 1): string {
  return `https://render.albiononline.com/v1/item/${itemId}.png?quality=${quality}&size=96`;
}

/**
 * Fetch entire local database from our private bridge (:5050)
 * with localStorage fallback. Zero requests to external projects.
 */
export async function fetchLocalDatabase(): Promise<Record<string, PriceRecord[]>> {
  try {
    const res = await fetch('http://localhost:5050/api/saved-prices');
    if (res.ok) {
      const data = await res.json();
      if (data && data.prices) {
        try {
          localStorage.setItem('albion_saved_prices', JSON.stringify(data.prices));
        } catch {}
        return data.prices;
      }
    }
  } catch {
    // Bridge offline, fallback to localStorage
    try {
      const cached = localStorage.getItem('albion_saved_prices');
      if (cached) return JSON.parse(cached);
    } catch {}
  }
  return {};
}

/**
 * Fetch prices exclusively from local database (bridge / localStorage)
 */
export async function fetchPrices(
  _server?: ServerRegion,
  itemIds: string[] = [],
  _locations?: City[],
  _qualities?: number[],
  _forceRefresh: boolean = false
): Promise<Map<string, PriceRecord[]>> {
  const result = new Map<string, PriceRecord[]>();
  const db = await fetchLocalDatabase();

  for (const id of itemIds) {
    if (db[id]) {
      result.set(id, db[id]);
    } else {
      result.set(id, []);
    }
  }

  return result;
}

/**
 * Helper to determine unit purchase price for ingredient.
 * Always uses the global minimum price across ALL captured cities —
 * so if planks are cheaper in Bridgewatch than Fort Sterling, that price wins.
 */
export function getMaterialPrice(
  records: PriceRecord[] | undefined,
  _city: City,
  orderType: 'buy_order' | 'direct_buy',
  customPrice?: number
): number {
  if (customPrice !== undefined && customPrice > 0) {
    return customPrice;
  }
  if (!records || records.length === 0) {
    return 0;
  }

  // Use ALL records (all cities) — find the global minimum
  if (orderType === 'buy_order') {
    const validBuy = records.filter(r => r.buy_price_max > 0);
    if (validBuy.length > 0) {
      return Math.min(...validBuy.map(r => r.buy_price_max));
    }
  }

  // Global cheapest sell order across all markets
  const validSell = records.filter(r => r.sell_price_min > 0);
  if (validSell.length > 0) {
    return Math.min(...validSell.map(r => r.sell_price_min));
  }

  const anyBuy = records.filter(r => r.buy_price_max > 0);
  if (anyBuy.length > 0) {
    return Math.min(...anyBuy.map(r => r.buy_price_max));
  }

  return 0;
}

/**
 * Helper to determine sell price for crafted product or full journal.
 * Prioritizes the chosen sell city, but seamlessly falls back to global minimum/maximum
 * across all scanned markets if the chosen city has no active price data.
 */
export function getProductSellPrice(
  records: PriceRecord[] | undefined,
  city: City,
  orderType: 'sell_order' | 'direct_sell',
  quality: number = 1,
  customPrice?: number
): number {
  if (customPrice !== undefined && customPrice > 0) {
    return customPrice;
  }
  if (!records || records.length === 0) {
    return 0;
  }

  // 1. City-specific records
  const cityRecords = records.filter(r => r.city.toLowerCase() === city.toLowerCase());
  const qualityCityRecords = cityRecords.filter(r => r.quality === quality);
  const targetCityRecords = qualityCityRecords.length > 0 ? qualityCityRecords : cityRecords;

  if (orderType === 'sell_order') {
    const validSell = targetCityRecords.filter(r => r.sell_price_min > 0);
    if (validSell.length > 0) {
      return Math.min(...validSell.map(r => r.sell_price_min));
    }
  } else {
    const validBuy = targetCityRecords.filter(r => r.buy_price_max > 0);
    if (validBuy.length > 0) {
      return Math.max(...validBuy.map(r => r.buy_price_max));
    }
  }

  // Fallback 1: any positive sell/buy price in target city
  const anySellCity = targetCityRecords.filter(r => r.sell_price_min > 0);
  if (anySellCity.length > 0) return Math.min(...anySellCity.map(r => r.sell_price_min));

  const anyBuyCity = targetCityRecords.filter(r => r.buy_price_max > 0);
  if (anyBuyCity.length > 0) return Math.max(...anyBuyCity.map(r => r.buy_price_max));

  // Fallback 2: fallback to global across all cities if specific city has no price data
  const qualityGlobalRecords = records.filter(r => r.quality === quality);
  const targetGlobalRecords = qualityGlobalRecords.length > 0 ? qualityGlobalRecords : records;

  if (orderType === 'sell_order') {
    const validSellGlobal = targetGlobalRecords.filter(r => r.sell_price_min > 0);
    if (validSellGlobal.length > 0) {
      return Math.min(...validSellGlobal.map(r => r.sell_price_min));
    }
  } else {
    const validBuyGlobal = targetGlobalRecords.filter(r => r.buy_price_max > 0);
    if (validBuyGlobal.length > 0) {
      return Math.max(...validBuyGlobal.map(r => r.buy_price_max));
    }
  }

  const anySellGlobal = records.filter(r => r.sell_price_min > 0);
  if (anySellGlobal.length > 0) return Math.min(...anySellGlobal.map(r => r.sell_price_min));

  const anyBuyGlobal = records.filter(r => r.buy_price_max > 0);
  if (anyBuyGlobal.length > 0) return Math.max(...anyBuyGlobal.map(r => r.buy_price_max));

  return 0;
}
