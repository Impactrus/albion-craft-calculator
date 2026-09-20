import { ServerRegion, City, PriceRecord, AlbionItem } from '../types/albion';

const BASE_URLS: Record<ServerRegion, string> = {
  europe: 'https://europe.albion-online-data.com',
  west: 'https://west.albion-online-data.com',
  east: 'https://east.albion-online-data.com',
};

// Local cache for fetched prices: key = `${server}_${itemId}_${city}`
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
      const records: PriceRecord[] = [];
      let allFound = true;
      for (const loc of locations) {
        const cacheKey = `${server}_${id}_${loc}`;
        const cached = priceCache.get(cacheKey);
        if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
          records.push(cached.record);
        } else {
          allFound = false;
          break;
        }
      }
      if (allFound && records.length > 0) {
        result.set(id, records);
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
        // Cache entry
        const cacheKey = `${server}_${record.item_id}_${record.city}`;
        priceCache.set(cacheKey, { record, timestamp: now });

        if (!result.has(record.item_id)) {
          result.set(record.item_id, []);
        }
        result.get(record.item_id)!.push(record);
      }
    } catch (err) {
      console.error(`Error fetching prices chunk:`, err);
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
 * Helper to determine sell price for crafted product
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

  let list = records.filter(r => r.city.toLowerCase() === city.toLowerCase());
  if (list.length === 0) {
    list = records;
  }

  // Filter for requested quality if available
  const qualityList = list.filter(r => r.quality === quality);
  const targetList = qualityList.length > 0 ? qualityList : list;

  if (orderType === 'sell_order') {
    // Sell Order: match minimum sell price in market
    const validSell = targetList.filter(r => r.sell_price_min > 0);
    if (validSell.length > 0) {
      return Math.min(...validSell.map(r => r.sell_price_min));
    }
  } else {
    // Direct Sell: sell immediately to highest buy order
    const validBuy = targetList.filter(r => r.buy_price_max > 0);
    if (validBuy.length > 0) {
      return Math.max(...validBuy.map(r => r.buy_price_max));
    }
  }

  // Fallbacks
  const anySell = targetList.filter(r => r.sell_price_min > 0);
  if (anySell.length > 0) return Math.min(...anySell.map(r => r.sell_price_min));

  const anyBuy = targetList.filter(r => r.buy_price_max > 0);
  if (anyBuy.length > 0) return Math.max(...anyBuy.map(r => r.buy_price_max));

  return 0;
}
