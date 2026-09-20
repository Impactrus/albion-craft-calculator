import { ServerRegion, City, PriceRecord, AlbionItem } from '../types/albion';

const BASE_URLS: Record<ServerRegion, string> = {
  europe: 'https://europe.albion-online-data.com',
  west: 'https://west.albion-online-data.com',
  east: 'https://east.albion-online-data.com',
};

// Local cache for fetched prices: key = `${server}_${itemId}_${city}`
// Local cache for fetched prices: key = `${server}_${itemId}`
const itemRecordsCache: Map<string, { records: PriceRecord[]; timestamp: number }> = new Map();
const priceCache: Map<string, { record: PriceRecord; timestamp: number }> = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

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
 * Fetch prices from Albion Online Data Project API
 */
export async function fetchPrices(
  server: ServerRegion,
  itemIds: string[],
  locations: City[] = ['Caerleon', 'Bridgewatch', 'Fort Sterling', 'Lymhurst', 'Martlock', 'Thetford', 'Brecilien', 'Black Market'],
  qualities: number[] = [1, 2, 3, 4, 5],
  forceRefresh: boolean = false
): Promise<Map<string, PriceRecord[]>> {
  const result = new Map<string, PriceRecord[]>();
  const now = Date.now();

  const missingIds: string[] = [];

  // Check cache first if not forced
  if (!forceRefresh) {
    for (const id of itemIds) {
      const cacheKey = `${server}_${id}`;
      const cached = itemRecordsCache.get(cacheKey);
      if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
        result.set(id, cached.records);
      } else {
        missingIds.push(id);
      }
    }
  } else {
    missingIds.push(...itemIds);
  }

  if (missingIds.length === 0) {
    return result;
  }

  // Deduplicate missing IDs
  const uniqueMissing = Array.from(new Set(missingIds));
  const baseUrl = BASE_URLS[server];

  // Batch query in chunks of 50 items
  const CHUNK_SIZE = 50;
  for (let i = 0; i < uniqueMissing.length; i += CHUNK_SIZE) {
    const chunk = uniqueMissing.slice(i, i + CHUNK_SIZE);
    const idListStr = chunk.join(',');
    const locStr = locations.map(encodeURIComponent).join(',');
    const qualStr = qualities.join(',');

    const url = `${baseUrl}/api/v2/stats/prices/${idListStr}.json?locations=${locStr}&qualities=${qualStr}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to fetch prices from ${url}: status ${response.status}`);
        continue;
      }

      const data: PriceRecord[] = await response.json();

      for (const record of data) {
        // Cache individual city record
        const cityKey = `${server}_${record.item_id}_${record.city}`;
        priceCache.set(cityKey, { record, timestamp: now });

        if (!result.has(record.item_id)) {
          result.set(record.item_id, []);
        }
        result.get(record.item_id)!.push(record);
      }
    } catch (err) {
      console.error(`Error fetching prices chunk:`, err);
    }
  }

  // Ensure all missing IDs have an entry in result and itemRecordsCache
  for (const id of uniqueMissing) {
    const records = result.get(id) || [];
    if (!result.has(id)) {
      result.set(id, records);
    }
    itemRecordsCache.set(`${server}_${id}`, { records, timestamp: now });
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
