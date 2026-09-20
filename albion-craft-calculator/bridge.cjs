/**
 * Albion Online Local Live Packet Bridge v2.0
 * Receives market orders from albiondata-client via HTTP POST
 * and broadcasts them in real time to the React web app via Server-Sent Events (SSE).
 */

const http = require('http');

const PORT = 5050;

// Mapping of Albion location IDs to Royal Cities & Outposts
// Based on albiondata-client LocationId values observed in live P18 traffic
const LOCATION_MAP = {
  // Fort Sterling
  '1002': 'Fort Sterling',
  '1000': 'Fort Sterling',
  '0001': 'Fort Sterling',
  '1': 'Fort Sterling',
  // Lymhurst
  '2004': 'Lymhurst',
  '2000': 'Lymhurst',
  '0002': 'Lymhurst',
  '2': 'Lymhurst',
  // Bridgewatch
  '3003': 'Bridgewatch',
  '3000': 'Bridgewatch',
  '0003': 'Bridgewatch',
  '3': 'Bridgewatch',
  // Caerleon
  '3005': 'Caerleon',
  '3002': 'Caerleon',
  '0301': 'Caerleon',
  '0007': 'Caerleon',  // observed in live P18 traffic
  '7': 'Caerleon',
  // Black Market (inside Caerleon)
  '3008': 'Black Market',
  '3007': 'Black Market',
  // Thetford
  '4002': 'Thetford',
  '4000': 'Thetford',
  '0004': 'Thetford',
  '4': 'Thetford',
  // Martlock
  '4006': 'Martlock',
  '4004': 'Martlock',
  '0005': 'Martlock',
  '5': 'Martlock',
  // Brecilien
  '5003': 'Brecilien',
  '5000': 'Brecilien',
  '0006': 'Brecilien',
  '6': 'Brecilien',
};

// Connected SSE clients
const sseClients = new Set();

// Cache of latest 100 captured orders
const recentOrders = [];

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // SSE Stream endpoint for React
  if (req.method === 'GET' && req.url === '/api/live-stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    res.write('event: connected\ndata: {"status":"connected"}\n\n');
    sseClients.add(res);
    console.log(`[Bridge] Nowy klient przeglądarki podłączony. Aktywnych połączeń: ${sseClients.size}`);

    // If we have recent orders, send them immediately on connect!
    if (recentOrders.length > 0) {
      res.write(`event: market_update\ndata: ${JSON.stringify(recentOrders.slice(-20))}\n\n`);
    }

    req.on('close', () => {
      sseClients.delete(res);
      console.log(`[Bridge] Klient rozłączony. Aktywnych połączeń: ${sseClients.size}`);
    });
    return;
  }

  // Status endpoint
  if (req.method === 'GET' && req.url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'running',
      clients: sseClients.size,
      cachedOrders: recentOrders.length
    }));
    return;
  }

  // Get recent orders endpoint
  if (req.method === 'GET' && req.url === '/api/recent-orders') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(recentOrders));
    return;
  }

  // Test packet trigger endpoint
  if (req.method === 'POST' && req.url === '/api/test-packet') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const mockOrders = [
        {
          Id: Math.floor(Math.random() * 100000),
          ItemTypeId: 'T4_MAIN_SWORD',
          LocationId: '1002',
          QualityLevel: 1,
          UnitPriceSilver: 355000000,
          AuctionType: 'offer',
          Amount: 10
        },
        {
          Id: Math.floor(Math.random() * 100000),
          ItemTypeId: 'T4_MAIN_SWORD',
          LocationId: '1002',
          QualityLevel: 4, // Excellent
          UnitPriceSilver: 420000000,
          AuctionType: 'offer',
          Amount: 2
        },
        {
          Id: Math.floor(Math.random() * 100000),
          ItemTypeId: 'T4_METALBAR',
          LocationId: '1002',
          QualityLevel: 1,
          UnitPriceSilver: 5200000,
          AuctionType: 'offer',
          Amount: 500
        }
      ];
      handleIncomingMarketData({ Orders: mockOrders }, '/test');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ sent: true, count: mockOrders.length }));
    });
    return;
  }

  // Ingest endpoint for albiondata-client (accepts POST to any path)
  if (req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        let parsed = null;
        if (body.trim().startsWith('{') || body.trim().startsWith('[')) {
          parsed = JSON.parse(body);
        }

        if (parsed) {
          handleIncomingMarketData(parsed, req.url);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ received: true }));
      } catch (err) {
        console.error('[Bridge] Błąd parsowania JSON:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

function handleIncomingMarketData(data, urlPath) {
  let orders = [];
  if (Array.isArray(data)) {
    orders = data;
  } else if (data.Orders && Array.isArray(data.Orders)) {
    orders = data.Orders;
  } else if (data.Id && data.ItemTypeId) {
    orders = [data];
  }

  if (orders.length === 0) return;

  const processedUpdates = [];

  for (const o of orders) {
    const rawId = o.ItemTypeId || o.ItemId;
    if (!rawId) continue;

    const locIdStr = String(o.LocationId || '').trim();
    // If location is unknown, log it so we can add it to the map
    let cityName = LOCATION_MAP[locIdStr];
    if (!cityName) {
      if (locIdStr) {
        console.warn(`[Bridge] ⚠️ Nieznany LocationId: "${locIdStr}" — dodaj do LOCATION_MAP`);
      }
      // Use raw ID if it looks like a city name string, otherwise mark as unknown
      cityName = (locIdStr.length > 2 && isNaN(Number(locIdStr))) ? locIdStr : `Nieznane (${locIdStr || '?'})`;
    }

    // UnitPriceSilver in Albion is raw * 10,000
    const rawPrice = Number(o.UnitPriceSilver || o.Price || 0);
    const realPrice = rawPrice >= 10000 ? Math.round(rawPrice / 10000) : rawPrice;

    if (realPrice <= 0) continue;

    const quality = Number(o.QualityLevel || 1);
    const auctionType = (o.AuctionType || 'offer').toLowerCase(); // 'offer' = sell order, 'request' = buy order

    const updatePayload = {
      item_id: rawId,
      city: cityName,
      quality,
      auction_type: auctionType,
      price: realPrice,
      amount: Number(o.Amount || 1),
      timestamp: new Date().toISOString(),
    };

    processedUpdates.push(updatePayload);

    // Save to recent cache
    recentOrders.push(updatePayload);
    if (recentOrders.length > 100) {
      recentOrders.shift();
    }
  }

  if (processedUpdates.length > 0) {
    console.log(`[Bridge] 🎯 Przechwycono ${processedUpdates.length} ofert z rynku gry:`);
    for (const p of processedUpdates.slice(0, 3)) {
      console.log(`   ➔ [${p.city}] ${p.item_id} (Jakość ${p.quality}): ${p.price.toLocaleString()} srebra (${p.auction_type})`);
    }
    if (processedUpdates.length > 3) {
      console.log(`   ... i ${processedUpdates.length - 3} więcej`);
    }
    broadcastToClients(processedUpdates);
  }
}

function broadcastToClients(updates) {
  const message = `event: market_update\ndata: ${JSON.stringify(updates)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

server.listen(PORT, () => {
  console.log('====================================================');
  console.log(`[Bridge] Serwer nasłuchu pakietów działa na porcie ${PORT}`);
  console.log(`[Bridge] Strumień dla przeglądarki: http://localhost:${PORT}/api/live-stream`);
  console.log('====================================================');
});
