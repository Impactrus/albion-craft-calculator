import React, { useState, useEffect, useCallback } from 'react';
import {
  ServerRegion,
  Language,
  UserCraftSettings,
  PriceRecord,
  AlbionDataStructure,
  CapturedMarketOrder,
  City
} from './types/albion';
import craftingDataRaw from './data/albion_crafting_data.json';
import { fetchPrices } from './services/albionApi';
import { Navbar } from './components/Navbar';
import { CraftPlanner } from './components/CraftPlanner';
import { RefiningCalculator } from './components/RefiningCalculator';
import { ProfitScanner } from './components/ProfitScanner';
import { CapturedPricesTab } from './components/CapturedPricesTab';
import { SettingsModal } from './components/SettingsModal';

const craftingData = craftingDataRaw as unknown as AlbionDataStructure;

const DEFAULT_SETTINGS: UserCraftSettings = {
  server: 'europe',
  craftCity: 'Fort Sterling',
  sellCity: 'Fort Sterling',
  hasPremium: true,
  useFocus: false,
  stationFeePer100Nutrition: 500,
  masteryLevel: 50,
  specLevel: 25,
  dailyBonus: 0,
  includeJournals: false,
  sellOrderType: 'sell_order',
  buyOrderType: 'direct_buy',
  customRrr: null,
};

export function App() {
  // Load saved settings from localStorage
  const [settings, setSettings] = useState<UserCraftSettings>(() => {
    try {
      const saved = localStorage.getItem('albion_craft_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_SETTINGS;
  });

  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('albion_craft_lang') as Language) || 'pl';
  });

  const [activeTab, setActiveTab] = useState<'planner' | 'refining' | 'scanner' | 'captured'>('planner');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isLoadingPrices, setIsLoadingPrices] = useState<boolean>(false);

  // Live sniffer packet status and toast
  const [snifferStatus, setSnifferStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Intercepted / captured live orders stream
  const [capturedOrders, setCapturedOrders] = useState<CapturedMarketOrder[]>([]);



  // In-memory price map
  const [priceMap, setPriceMap] = useState<Map<string, PriceRecord[]>>(new Map());

  // Silently sync newly fetched or updated prices to bridge prices_database.json in background
  const syncPricesToBridge = useCallback((records: PriceRecord[]) => {
    if (records.length === 0) return;
    fetch('http://localhost:5050/api/save-prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records })
    }).catch(() => { /* bridge offline, ignore */ });
  }, []);

  // Silently load persistent prices from bridge prices_database.json on startup
  useEffect(() => {
    fetch('http://localhost:5050/api/saved-prices')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Bridge offline');
      })
      .then((data) => {
        if (data && data.prices) {
          setPriceMap((prev) => {
            const next = new Map(prev);
            Object.entries(data.prices).forEach(([id, recs]) => {
              next.set(id, recs as PriceRecord[]);
            });
            return next;
          });
          // Cache in localStorage as offline backup
          try {
            localStorage.setItem('albion_saved_prices', JSON.stringify(data.prices));
          } catch (e) {
            console.warn(e);
          }
        }
      })
      .catch(() => {
        // Fallback to localStorage if bridge is not running
        try {
          const cached = localStorage.getItem('albion_saved_prices');
          if (cached) {
            const parsed = JSON.parse(cached);
            setPriceMap((prev) => {
              const next = new Map(prev);
              Object.entries(parsed).forEach(([id, recs]) => {
                next.set(id, recs as PriceRecord[]);
              });
              return next;
            });
          }
        } catch (e) {
          console.error(e);
        }
      });
  }, []);

  // Connect to local packet bridge via Server-Sent Events
  useEffect(() => {
    let eventSource: EventSource | null = null;

    // Fetch any recently cached orders from bridge on initial mount
    fetch('http://localhost:5050/api/recent-orders')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCapturedOrders(data.slice().reverse());
        }
      })
      .catch(() => {});

    const connectBridge = () => {
      try {
        eventSource = new EventSource('http://localhost:5050/api/live-stream');

        eventSource.addEventListener('connected', () => {
          setSnifferStatus('connected');
        });

        eventSource.addEventListener('market_update', (event) => {
          try {
            const updates: CapturedMarketOrder[] = JSON.parse(event.data);
            if (!Array.isArray(updates) || updates.length === 0) return;

            // Prepend new captured orders (newest first, limit 300)
            setCapturedOrders((prev) => {
              const combined = [...updates, ...prev];
              return combined.slice(0, 300);
            });

            setPriceMap((prev) => {
              const next = new Map(prev);
              for (const u of updates) {
                // Helper: upsert a PriceRecord into the map under a given key
                const upsert = (key: string, rec: PriceRecord) => {
                  const existing = next.get(key) || [];
                  const idx = existing.findIndex(
                    (r) => r.city.toLowerCase() === rec.city.toLowerCase() && r.quality === rec.quality
                  );
                  if (idx >= 0) {
                    // Keep lower sell price (best deal for buyer)
                    existing[idx] = {
                      ...existing[idx],
                      ...rec,
                      sell_price_min: Math.min(existing[idx].sell_price_min || rec.sell_price_min, rec.sell_price_min),
                    };
                  } else {
                    existing.push(rec);
                  }
                  next.set(key, [...existing]);
                };

                const newRec: PriceRecord = {
                  item_id: u.item_id,
                  city: u.city,
                  quality: u.quality,
                  sell_price_min: u.auction_type === 'offer' ? u.price : 0,
                  sell_price_min_date: u.timestamp,
                  sell_price_max: u.auction_type === 'offer' ? u.price : 0,
                  sell_price_max_date: u.timestamp,
                  buy_price_min: u.auction_type === 'request' ? u.price : 0,
                  buy_price_min_date: u.timestamp,
                  buy_price_max: u.auction_type === 'request' ? u.price : 0,
                  buy_price_max_date: u.timestamp,
                };

                // Store under exact item_id (e.g. T4_PLANKS_LEVEL2@2)
                upsert(u.item_id, newRec);

                // ALSO store under base id (e.g. T4_PLANKS_LEVEL2) so recipe lookups work
                // Recipes reference materials without @enchantment suffix
                const atIdx = u.item_id.indexOf('@');
                if (atIdx > 0) {
                  const baseId = u.item_id.slice(0, atIdx);
                  upsert(baseId, { ...newRec, item_id: baseId });
                }
              }
              return next;
            });

            const first = updates[0];
            const countStr = updates.length > 1 ? ` (+${updates.length - 1} innych)` : '';
            setToastMessage(`🎯 [${first.city}] Przechwycono ${first.item_id}: ${first.price.toLocaleString()} srebra${countStr}`);
          } catch (e) {
            console.error('Error handling market_update event:', e);
          }
        });

        eventSource.onerror = () => {
          setSnifferStatus('disconnected');
          eventSource?.close();
          // Retry after 5 seconds
          setTimeout(connectBridge, 5000);
        };
      } catch (e) {
        setSnifferStatus('disconnected');
      }
    };

    connectBridge();

    return () => {
      eventSource?.close();
    };
  }, []);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Save settings when changed
  useEffect(() => {
    localStorage.setItem('albion_craft_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('albion_craft_lang', language);
  }, [language]);

  const handleUpdateSettings = useCallback((newSettings: Partial<UserCraftSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  // Refresh prices from our private local bridge database
  const handleRefreshPrices = useCallback(
    async (_itemIds?: string[]) => {
      setIsLoadingPrices(true);
      try {
        const res = await fetch('http://localhost:5050/api/saved-prices');
        if (res.ok) {
          const data = await res.json();
          if (data && data.prices) {
            setPriceMap((prev) => {
              const next = new Map(prev);
              Object.entries(data.prices).forEach(([id, recs]) => {
                next.set(id, recs as PriceRecord[]);
              });
              return next;
            });
            try {
              localStorage.setItem('albion_saved_prices', JSON.stringify(data.prices));
            } catch {}
          }
        }
      } catch (err) {
        console.error('Error refreshing prices from local database:', err);
      } finally {
        setIsLoadingPrices(false);
      }
    },
    []
  );

  // Send simulated test packet to bridge
  const handleSendTestPacket = useCallback(async () => {
    try {
      await fetch('http://localhost:5050/api/test-packet', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Clear captured orders
  const handleClearOrders = useCallback(() => {
    setCapturedOrders([]);
  }, []);

  // Jump from Refining or Scanner into Planner (still useful for those tabs)
  const handleSelectIntoPlanner = useCallback((itemId: string, enchantment: number, quality?: number, city?: City) => {
    setActiveTab('planner');
    if (city && ['Fort Sterling','Lymhurst','Bridgewatch','Martlock','Thetford','Caerleon','Brecilien','Black Market'].includes(city)) {
      handleUpdateSettings({ sellCity: city });
    }
  }, [handleUpdateSettings]);

  return (
    <div className="min-h-screen bg-[#0b0d13] flex flex-col text-slate-200">
      
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        server={settings.server}
        setServer={(srv) => handleUpdateSettings({ server: srv })}
        language={language}
        setLanguage={setLanguage}
        hasPremium={settings.hasPremium}
        setHasPremium={(prem) => handleUpdateSettings({ hasPremium: prem })}
        onOpenSettings={() => setIsSettingsOpen(true)}
        snifferStatus={snifferStatus}
        capturedCount={capturedOrders.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {activeTab === 'planner' && (
          <CraftPlanner
            items={craftingData.items}
            cityBonuses={craftingData.cityBonuses}
            journalData={craftingData.journals}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            priceMap={priceMap}
            onRefreshPrices={handleRefreshPrices}
            isLoadingPrices={isLoadingPrices}
            language={language}
          />
        )}

        {activeTab === 'refining' && (
          <RefiningCalculator
            items={craftingData.items}
            cityBonuses={craftingData.cityBonuses}
            journalData={craftingData.journals}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            priceMap={priceMap}
            onRefreshPrices={handleRefreshPrices}
            isLoadingPrices={isLoadingPrices}
            language={language}
            onSelectIntoPlanner={handleSelectIntoPlanner}
          />
        )}

        {activeTab === 'scanner' && (
          <ProfitScanner
            items={craftingData.items}
            cityBonuses={craftingData.cityBonuses}
            journalData={craftingData.journals}
            settings={settings}
            priceMap={priceMap}
            onRefreshPrices={handleRefreshPrices}
            isLoadingPrices={isLoadingPrices}
            language={language}
            onSelectIntoPlanner={handleSelectIntoPlanner}
          />
        )}

        {activeTab === 'captured' && (
          <CapturedPricesTab
            orders={capturedOrders}
            items={craftingData.items}
            language={language}
            onClearOrders={handleClearOrders}
            snifferStatus={snifferStatus}
            onSendTestPacket={handleSendTestPacket}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-[#1f2535] bg-[#0e1118] py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Albion Online Crafting & Profit Calculator • Darmowy i niezależny kalkulator craftingu
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Baza cen: <span className="text-emerald-400 font-medium">Własna baza lokalna (Prywatny Sniffer Live)</span>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        language={language}
      />

      {/* Floating Live Packet Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#121927] border-2 border-emerald-500/60 text-emerald-300 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md transition-all">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-bold font-mono tracking-wide">{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
export default App;
