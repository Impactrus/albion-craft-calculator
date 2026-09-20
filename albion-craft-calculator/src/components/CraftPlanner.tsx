import React, { useState, useEffect, useMemo } from 'react';
import {
  AlbionItem,
  City,
  UserCraftSettings,
  CalculationResult,
  Language,
  PriceRecord,
  JournalTierInfo
} from '../types/albion';
import { calculateCrafting, hasCityBonus } from '../services/calculator';
import { getItemRenderUrl, getItemApiId } from '../services/albionApi';
import {
  Search,
  Sparkles,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Scale,
  Zap,
  Building,
  DollarSign,
  Info,
  CheckCircle2,
  Edit2,
  RotateCcw,
  BookOpen
} from 'lucide-react';

interface CraftPlannerProps {
  items: AlbionItem[];
  cityBonuses: Record<string, { refining: string[]; crafting: string[] }>;
  journalData: Record<string, Record<string, JournalTierInfo>>;
  settings: UserCraftSettings;
  onUpdateSettings: (newSettings: Partial<UserCraftSettings>) => void;
  priceMap: Map<string, PriceRecord[]>;
  onRefreshPrices: (itemIds: string[]) => Promise<void>;
  isLoadingPrices: boolean;
  language: Language;
}

const CITIES: City[] = [
  'Bridgewatch', 'Fort Sterling', 'Lymhurst', 'Martlock',
  'Thetford', 'Caerleon', 'Brecilien', 'Black Market'
];

export const CraftPlanner: React.FC<CraftPlannerProps> = ({
  items, cityBonuses, journalData, settings, onUpdateSettings,
  priceMap, onRefreshPrices, isLoadingPrices, language,
}) => {
  // Persist selection in localStorage so switching tabs doesn't reset it
  const [selectedItemId, setSelectedItemId] = useState<string>(() =>
    localStorage.getItem('cp_itemId') || 'T4_MAIN_SWORD'
  );
  const [enchantment, setEnchantment] = useState<number>(() =>
    Number(localStorage.getItem('cp_enchantment') ?? 0)
  );
  const [quality, setQuality] = useState<number>(() =>
    Number(localStorage.getItem('cp_quality') ?? 1)
  );
  const [quantity, setQuantity] = useState<number>(() =>
    Number(localStorage.getItem('cp_quantity') ?? 10)
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<number>(0);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Custom price overrides per item ID
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});

  // Save selection to localStorage whenever it changes
  useEffect(() => { localStorage.setItem('cp_itemId', selectedItemId); }, [selectedItemId]);
  useEffect(() => { localStorage.setItem('cp_enchantment', String(enchantment)); }, [enchantment]);
  useEffect(() => { localStorage.setItem('cp_quality', String(quality)); }, [quality]);
  useEffect(() => { localStorage.setItem('cp_quantity', String(quantity)); }, [quantity]);




  const QUALITIES = [
    { level: 1, namePl: 'Normalna', nameEn: 'Normal', short: 'Norm' },
    { level: 2, namePl: 'Dobra', nameEn: 'Good', short: 'Dobra' },
    { level: 3, namePl: 'Znakomita', nameEn: 'Outstanding', short: 'Znak' },
    { level: 4, namePl: 'Wybitna', nameEn: 'Excellent', short: 'Wyb' },
    { level: 5, namePl: 'Arcydzieło', nameEn: 'Masterpiece', short: 'Arcy' },
  ];

  // Selected item object
  const selectedItem = useMemo(() => {
    return items.find((it) => it.id === selectedItemId) || items[0];
  }, [items, selectedItemId]);

  // Filtered items for search
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return items.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (tierFilter !== 0 && item.tier !== tierFilter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.name_pl.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
      );
    }).slice(0, 50); // limit for fast rendering
  }, [items, searchQuery, categoryFilter, tierFilter]);

  // Calculation result
  const calcResult: CalculationResult | null = useMemo(() => {
    if (!selectedItem) return null;
    return calculateCrafting(
      selectedItem,
      enchantment,
      quantity,
      settings,
      priceMap,
      customPrices,
      cityBonuses,
      journalData,
      quality
    );
  }, [selectedItem, enchantment, quantity, settings, priceMap, customPrices, cityBonuses, journalData, quality]);

  // Available enchantment levels for selected item
  const availableEnchantments = useMemo(() => {
    if (!selectedItem) return [0];
    return Object.keys(selectedItem.recipes).map(Number).sort();
  }, [selectedItem]);

  // Check if current craft city has bonus
  const isBonusCity = useMemo(() => {
    if (!selectedItem) return false;
    return hasCityBonus(selectedItem, settings.craftCity, cityBonuses);
  }, [selectedItem, settings.craftCity, cityBonuses]);

  // Handle refreshing prices for currently viewed item & materials
  const handleRefreshCurrent = async () => {
    if (!selectedItem) return;
    const idsToFetch: string[] = [];
    
    // Product ID
    idsToFetch.push(getItemApiId(selectedItem, enchantment));

    // Materials IDs
    const recipe = selectedItem.recipes[String(enchantment)] || selectedItem.recipes['0'];
    if (recipe && recipe.resources) {
      recipe.resources.forEach((r) => idsToFetch.push(r.id));
    }

    // Journals IDs if enabled
    if (settings.includeJournals && selectedItem.journalType && journalData[selectedItem.journalType]) {
      const jInfo = journalData[selectedItem.journalType][`T${selectedItem.tier}`];
      if (jInfo) {
        idsToFetch.push(jInfo.empty, jInfo.full);
      }
    }

    await onRefreshPrices(idsToFetch);
  };

  const handleCustomPriceChange = (id: string, val: string) => {
    const num = parseFloat(val);
    setCustomPrices((prev) => {
      if (isNaN(num) || num < 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: num };
    });
  };

  const handleResetCustomPrice = (id: string) => {
    setCustomPrices((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const t = {
    searchPlaceholder: language === 'pl' ? 'Szukaj przedmiotu (np. Miecz, Pancerz, Planks)...' : 'Search item (e.g. Sword, Armor, Planks)...',
    allCategories: language === 'pl' ? 'Wszystkie kategorie' : 'All Categories',
    allTiers: language === 'pl' ? 'Wszystkie tiery' : 'All Tiers',
    weapons: language === 'pl' ? 'Broń' : 'Weapons',
    equipment: language === 'pl' ? 'Pancerze & Sprzęt' : 'Equipment',
    refining: language === 'pl' ? 'Przetwórstwo' : 'Refining',
    cooking: language === 'pl' ? 'Gotowanie' : 'Cooking',
    alchemy: language === 'pl' ? 'Alchemia' : 'Alchemy',
    resources: language === 'pl' ? 'Surowce' : 'Resources',
    craftCity: language === 'pl' ? 'Miasto wytwarzania' : 'Crafting City',
    sellCity: language === 'pl' ? 'Miasto sprzedaży' : 'Selling City',
    cityBonusActive: language === 'pl' ? '★ Bonus Produkcyjny Miasta Aktywny!' : '★ City Production Bonus Active!',
    cityBonusInactive: language === 'pl' ? 'Brak bonusu w tym mieście' : 'No bonus in this city',
    useFocus: language === 'pl' ? 'Użyj Focusu (Skupienia)' : 'Use Crafting Focus',
    quantity: language === 'pl' ? 'Ilość' : 'Quantity',
    netProfit: language === 'pl' ? 'Czysty Zysk (Net Profit)' : 'Net Profit',
    profitMargin: language === 'pl' ? 'Marża Zysku' : 'Profit Margin',
    silverFocus: language === 'pl' ? 'Srebro / Focus' : 'Silver / Focus',
    returnRate: language === 'pl' ? 'Zwrot Surowców (RRR)' : 'Return Rate (RRR)',
    cargoWeight: language === 'pl' ? 'Waga Transportu' : 'Cargo Weight',
    breakdownTitle: language === 'pl' ? 'Zestawienie Materiałów i Kosztów' : 'Materials & Cost Breakdown',
    refreshPrices: language === 'pl' ? 'Pobierz aktualne ceny z API' : 'Refresh Live Prices',
    material: language === 'pl' ? 'Materiał / Surowiec' : 'Material / Resource',
    needed: language === 'pl' ? 'Wymagane' : 'Needed',
    returned: language === 'pl' ? 'Zwrot (RRR)' : 'Returned',
    netCount: language === 'pl' ? 'Netto zużycie' : 'Net Count',
    unitPrice: language === 'pl' ? 'Cena jedn. (Srebro)' : 'Unit Price (Silver)',
    totalCost: language === 'pl' ? 'Koszt' : 'Cost',
    stationTax: language === 'pl' ? 'Podatek stacji (Żywność)' : 'Station Fee (Nutrition)',
    marketSalesTax: language === 'pl' ? 'Podatek rynkowy ze sprzedaży' : 'Market Sales Tax',
    marketSetupFee: language === 'pl' ? 'Prowizja wystawienia (Setup fee 2.5%)' : 'Market Setup Fee (2.5%)',
    journalsFilled: language === 'pl' ? 'Dzienniki rzemieślnicze' : 'Crafting Journals',
    grossRevenue: language === 'pl' ? 'Przychód brutto' : 'Gross Revenue',
    netRevenue: language === 'pl' ? 'Przychód netto' : 'Net Revenue',
    totalCostsSum: language === 'pl' ? 'Suma kosztów netto' : 'Total Net Costs',
    customPriceNotice: language === 'pl' ? 'Ręcznie wpisana cena' : 'Custom price override',
    resetPrice: language === 'pl' ? 'Przywróć cenę z API' : 'Reset to API price',
  };

  return (
    <div className="space-y-6">
      
      {/* Top Search & Filter Bar */}
      <div className="bg-[#141824] border border-[#262e42] rounded-xl p-4 shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          
          {/* Search Input with dropdown */}
          <div className="sm:col-span-6 relative">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                placeholder={t.searchPlaceholder}
                className="w-full pl-11 pr-4 py-2.5 bg-[#0f121a] border border-[#2b334a] rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            {/* Autocomplete Dropdown */}
            {isSearchOpen && (
              <div 
                className="absolute z-40 left-0 right-0 mt-1.5 max-h-80 overflow-y-auto bg-[#181c2b] border border-[#333d59] rounded-xl shadow-2xl divide-y divide-[#252c3f]"
                onMouseLeave={() => setIsSearchOpen(false)}
              >
                {filteredItems.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Brak wyników / No items found
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedItemId(item.id);
                        setEnchantment(0);
                        setIsSearchOpen(false);
                      }}
                      className="p-2.5 flex items-center gap-3 hover:bg-[#23283b] cursor-pointer transition"
                    >
                      <img
                        src={getItemRenderUrl(item.id)}
                        alt={item.name}
                        className="w-10 h-10 object-contain rounded bg-[#0e1017] border border-[#282f42]"
                        loading="lazy"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded tier-badge-${item.tier}`}>
                            T{item.tier}
                          </span>
                          <span className="text-sm font-semibold text-slate-200 truncate">
                            {language === 'pl' ? item.name_pl : item.name}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                          {language === 'pl' ? item.name : item.name_pl} • {item.subcategory}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full py-2.5 px-3 bg-[#0f121a] border border-[#2b334a] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">{t.allCategories}</option>
              <option value="weapons">{t.weapons}</option>
              <option value="equipment">{t.equipment}</option>
              <option value="refining">{t.refining}</option>
              <option value="cooking">{t.cooking}</option>
              <option value="alchemy">{t.alchemy}</option>
            </select>
          </div>

          {/* Tier Filter */}
          <div className="sm:col-span-3">
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(Number(e.target.value))}
              className="w-full py-2.5 px-3 bg-[#0f121a] border border-[#2b334a] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value={0}>{t.allTiers}</option>
              <option value={3}>Tier 3 (Czeladnik)</option>
              <option value={4}>Tier 4 (Adept)</option>
              <option value={5}>Tier 5 (Ekspert)</option>
              <option value={6}>Tier 6 (Mistrz)</option>
              <option value={7}>Tier 7 (Arcymistrz)</option>
              <option value={8}>Tier 8 (Starszy)</option>
            </select>
          </div>

        </div>
      </div>

      {/* Item Setup & Configuration Panel */}
      <div className="bg-[#141824] border border-[#262e42] rounded-xl p-5 shadow-lg">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Selected Item Visual & Name */}
          <div className="lg:col-span-5 flex items-center gap-4">
            <div className="relative">
              <img
                src={getItemRenderUrl(getItemApiId(selectedItem, enchantment), quality)}
                alt={selectedItem.name}
                className="w-20 h-20 object-contain rounded-xl bg-[#0d0f17] border-2 border-amber-500/30 p-1 shadow-inner"
              />
              <span className={`absolute -top-2 -left-2 text-xs font-bold px-2 py-0.5 rounded-md shadow tier-badge-${selectedItem.tier}`}>
                T{selectedItem.tier}.{enchantment}
              </span>
              {quality > 1 && (
                <span className="absolute -bottom-2 -right-2 text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500 text-black shadow">
                  Q{quality}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold font-albion text-amber-400 truncate">
                {language === 'pl' ? selectedItem.name_pl : selectedItem.name}
              </h2>
              <div className="text-xs text-slate-400 truncate mb-2">
                {language === 'pl' ? selectedItem.name : selectedItem.name_pl} • {selectedItem.subcategory}
              </div>

              {/* Enchantment Buttons */}
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 mr-0.5">Poziom:</span>
                {availableEnchantments.map((enc) => (
                  <button
                    key={enc}
                    onClick={() => setEnchantment(enc)}
                    className={`px-2 py-0.5 text-xs font-bold rounded border transition ${
                      enchantment === enc
                        ? `bg-amber-500/20 text-amber-300 border-amber-400 shadow`
                        : `bg-[#181c2b] text-slate-400 border-slate-700 hover:text-white`
                    }`}
                  >
                    .{enc}
                  </button>
                ))}
              </div>

              {/* Quality Buttons */}
              {selectedItem.category !== 'refining' && selectedItem.category !== 'consumables' && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 mr-0.5">Jakość:</span>
                  {QUALITIES.map((q) => (
                    <button
                      key={q.level}
                      onClick={() => setQuality(q.level)}
                      className={`px-1.5 py-0.5 text-[10px] font-semibold rounded border transition ${
                        quality === q.level
                          ? 'bg-amber-500 text-black border-amber-400 font-bold shadow'
                          : 'bg-[#181c2b] text-slate-400 border-slate-700 hover:text-white'
                      }`}
                      title={`${q.namePl} (${q.nameEn})`}
                    >
                      {language === 'pl' ? q.short : q.nameEn}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cities & Bonus Indicator */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-3">
            {/* Crafting City */}
            <div>
              <label className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">
                {t.craftCity}
              </label>
              <select
                value={settings.craftCity}
                onChange={(e) => onUpdateSettings({ craftCity: e.target.value as City })}
                className="w-full py-2 px-2.5 bg-[#0f121a] border border-[#2b334a] rounded-lg text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="mt-1 flex items-center gap-1 text-[11px]">
                {isBonusCity ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                    <Sparkles className="w-3 h-3" />
                    {t.cityBonusActive}
                  </span>
                ) : (
                  <span className="text-slate-500">{t.cityBonusInactive}</span>
                )}
              </div>
            </div>

            {/* Selling City */}
            <div>
              <label className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">
                {t.sellCity}
              </label>
              <select
                value={settings.sellCity}
                onChange={(e) => onUpdateSettings({ sellCity: e.target.value as City })}
                className="w-full py-2 px-2.5 bg-[#0f121a] border border-[#2b334a] rounded-lg text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="mt-1 text-[11px] text-slate-400">
                {settings.sellOrderType === 'sell_order' ? 'Sell Order (+2.5%)' : 'Direct Sell (0%)'}
              </div>
            </div>
          </div>

          {/* Focus Toggle & Quantity */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            {/* Focus Button */}
            <button
              onClick={() => onUpdateSettings({ useFocus: !settings.useFocus })}
              className={`w-full py-2.5 px-3 rounded-lg border font-semibold text-xs flex items-center justify-between transition-all ${
                settings.useFocus
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-md shadow-amber-950/40'
                  : 'bg-[#181c2b] text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Zap className={`w-4 h-4 ${settings.useFocus ? 'text-amber-400 fill-amber-400' : 'text-slate-500'}`} />
                {t.useFocus}
              </span>
              <span className="font-mono text-[11px]">
                {settings.useFocus ? `${calcResult?.focusCostPerUnit || 0} / szt.` : 'OFF'}
              </span>
            </button>

            {/* Quantity Controls */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-semibold mr-1">{t.quantity}:</span>
              {[1, 10, 50, 100].map((qty) => (
                <button
                  key={qty}
                  onClick={() => setQuantity(qty)}
                  className={`px-2 py-1 text-xs font-bold rounded border transition ${
                    quantity === qty
                      ? 'bg-amber-500 text-black border-amber-400'
                      : 'bg-[#181c2b] text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {qty}
                </button>
              ))}
              <input
                type="number"
                min="1"
                max="10000"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 py-1 px-2 bg-[#0f121a] border border-[#2b334a] rounded text-xs text-amber-300 font-mono text-center focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

        </div>
      </div>

      {/* KPI Profit Metrics Cards */}
      {calcResult && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Net Profit Card */}
          <div className={`p-4 rounded-xl border col-span-2 lg:col-span-1 flex flex-col justify-between ${
            calcResult.netProfit >= 0
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400'
              : 'bg-red-950/30 border-red-500/40 text-red-400'
          }`}>
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
              <span>{t.netProfit}</span>
              {calcResult.netProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
            <div className="my-2">
              <div className="text-2xl font-black font-mono tracking-tight">
                {calcResult.netProfit > 0 ? '+' : ''}{calcResult.netProfit.toLocaleString()}
              </div>
              <div className="text-[11px] opacity-80">
                {(calcResult.netProfit / quantity).toFixed(0)} srebra / szt.
              </div>
            </div>
            <div className="text-[10px] text-slate-400">
              Przychód: {calcResult.netRevenue.toLocaleString()} | Koszt: {calcResult.totalCost.toLocaleString()}
            </div>
          </div>

          {/* Profit Margin */}
          <div className="bg-[#141824] border border-[#262e42] p-4 rounded-xl flex flex-col justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t.profitMargin}
            </div>
            <div className="my-2">
              <div className={`text-2xl font-black font-mono tracking-tight ${
                calcResult.profitMarginPercent >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {calcResult.profitMarginPercent > 0 ? '+' : ''}{calcResult.profitMarginPercent}%
              </div>
              <div className="text-[11px] text-slate-400">
                ROI z craftu
              </div>
            </div>
            <div className="text-[10px] text-slate-500">
              Zysk z zainwestowanego srebra
            </div>
          </div>

          {/* Silver per Focus */}
          <div className="bg-[#141824] border border-[#262e42] p-4 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>{t.silverFocus}</span>
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-black font-mono tracking-tight text-amber-400">
                {calcResult.silverPerFocus > 0 ? `${calcResult.silverPerFocus}` : '—'}
              </div>
              <div className="text-[11px] text-slate-400">
                Srebra / 1 pkt focusu
              </div>
            </div>
            <div className="text-[10px] text-slate-500">
              Zużyto: {calcResult.totalFocusUsed.toLocaleString()} focusu
            </div>
          </div>

          {/* Return Rate RRR */}
          <div className="bg-[#141824] border border-[#262e42] p-4 rounded-xl flex flex-col justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t.returnRate}
            </div>
            <div className="my-2">
              <div className="text-2xl font-black font-mono tracking-tight text-blue-400">
                {calcResult.returnRatePercent}%
              </div>
              <div className="text-[11px] text-slate-400">
                Mnożnik zasobów: ×{calcResult.effectiveMultiplier}
              </div>
            </div>
            <div className="text-[10px] text-slate-500">
              Odzyskano surowce warte {calcResult.returnedMaterialsValue.toLocaleString()}
            </div>
          </div>

          {/* Cargo Weight */}
          <div className="bg-[#141824] border border-[#262e42] p-4 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>{t.cargoWeight}</span>
              <Scale className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-black font-mono tracking-tight text-slate-200">
                {calcResult.outputWeight} kg
              </div>
              <div className="text-[11px] text-slate-400">
                Surowce: {calcResult.inputWeight} kg
              </div>
            </div>
            <div className="text-[10px] text-slate-500">
              Do transportu wierzchowcem
            </div>
          </div>

        </div>
      )}

      {/* Materials and Calculation Details Table */}
      {calcResult && (
        <div className="bg-[#141824] border border-[#262e42] rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-[#262e42] flex flex-wrap items-center justify-between gap-3 bg-[#181d2c]">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-slate-100">{t.breakdownTitle}</h3>
            </div>

            <button
              onClick={handleRefreshCurrent}
              disabled={isLoadingPrices}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold hover:bg-amber-500/30 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPrices ? 'animate-spin' : ''}`} />
              {t.refreshPrices}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#262e42] text-slate-400 bg-[#121520] uppercase text-[10px] tracking-wider">
                  <th className="p-3.5">{t.material}</th>
                  <th className="p-3.5 text-center">{t.needed}</th>
                  <th className="p-3.5 text-center">{t.returned}</th>
                  <th className="p-3.5 text-center font-bold text-amber-400">{t.netCount}</th>
                  <th className="p-3.5 text-right">{t.unitPrice}</th>
                  <th className="p-3.5 text-right">{t.totalCost}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#1e2433] text-slate-200">
                
                {/* Materials Rows */}
                {calcResult.materials.map((mat) => (
                  <tr key={mat.id} className="hover:bg-[#181c2b] transition">
                    <td className="p-3.5 flex items-center gap-3">
                      <img
                        src={getItemRenderUrl(mat.id)}
                        alt={mat.id}
                        className="w-8 h-8 rounded bg-[#0b0d13] border border-[#2b334a] p-0.5 object-contain"
                      />
                      <div>
                        <div className="font-semibold text-slate-200">{mat.id}</div>
                        {mat.isCustomPrice && (
                          <div className="text-[10px] text-amber-400 flex items-center gap-1">
                            <Edit2 className="w-2.5 h-2.5" /> {t.customPriceNotice}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5 text-center font-mono">{mat.countNeeded}</td>
                    <td className="p-3.5 text-center font-mono text-emerald-400">+{mat.countReturned}</td>
                    <td className="p-3.5 text-center font-mono font-bold text-amber-300">{mat.netCount}</td>

                    {/* Unit Price with inline edit */}
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <input
                          type="number"
                          value={customPrices[mat.id] !== undefined ? customPrices[mat.id] : mat.unitPrice}
                          onChange={(e) => handleCustomPriceChange(mat.id, e.target.value)}
                          className="w-24 px-2 py-1 bg-[#0d0f17] border border-[#2e374f] rounded text-right font-mono text-amber-300 focus:outline-none focus:border-amber-500"
                        />
                        {customPrices[mat.id] !== undefined && (
                          <button
                            onClick={() => handleResetCustomPrice(mat.id)}
                            title={t.resetPrice}
                            className="p-1 text-slate-400 hover:text-amber-400"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5 text-right font-mono font-bold text-slate-100">
                      {mat.totalCost.toLocaleString()}
                    </td>
                  </tr>
                ))}

                {/* Crafting Station Nutrition Tax */}
                <tr className="bg-[#121622]/50">
                  <td colSpan={4} className="p-3.5 font-medium text-slate-400">
                    {t.stationTax} ({settings.stationFeePer100Nutrition} srebra / 100 food)
                  </td>
                  <td className="p-3.5 text-right text-slate-400 font-mono text-[11px]">
                    {(calcResult.stationTaxTotal / quantity).toFixed(1)} / szt.
                  </td>
                  <td className="p-3.5 text-right font-mono font-bold text-amber-300">
                    +{calcResult.stationTaxTotal.toLocaleString()}
                  </td>
                </tr>

                {/* Journals Row if enabled */}
                {settings.includeJournals && calcResult.journalsFilled > 0 && (
                  <tr className="bg-[#121622]/50">
                    <td colSpan={4} className="p-3.5 font-medium text-purple-300 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-purple-400" />
                      {t.journalsFilled} ({calcResult.journalsFilled} szt. napełniono)
                    </td>
                    <td className="p-3.5 text-right text-purple-300 font-mono text-[11px]">
                      Zysk netto z dzienników
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                      +{calcResult.journalNetProfit.toLocaleString()}
                    </td>
                  </tr>
                )}

                {/* Final Product Row (Sell Price) */}
                <tr className="bg-[#191e2e] font-bold border-t-2 border-[#2c354d]">
                  <td className="p-3.5 flex items-center gap-3">
                    <img
                      src={getItemRenderUrl(getItemApiId(selectedItem, enchantment))}
                      alt={selectedItem.name}
                      className="w-8 h-8 rounded bg-[#0b0d13] border border-amber-500/40 p-0.5 object-contain"
                    />
                    <div>
                      <div className="text-amber-400">
                        {language === 'pl' ? selectedItem.name_pl : selectedItem.name} (×{calcResult.amountCraftedTotal})
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        Sprzedaż w: {settings.sellCity} ({settings.sellOrderType})
                      </div>
                    </div>
                  </td>
                  <td colSpan={3} className="p-3.5 text-center text-slate-400 font-mono text-[11px]">
                    Prowizje rynku: -{(calcResult.salesTaxTotal + calcResult.setupFeeTotal).toLocaleString()} srebra
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <input
                        type="number"
                        value={customPrices[getItemApiId(selectedItem, enchantment)] !== undefined 
                          ? customPrices[getItemApiId(selectedItem, enchantment)] 
                          : calcResult.unitSellPrice}
                        onChange={(e) => handleCustomPriceChange(getItemApiId(selectedItem, enchantment), e.target.value)}
                        className="w-24 px-2 py-1 bg-[#0d0f17] border border-amber-500/40 rounded text-right font-mono text-emerald-400 focus:outline-none focus:border-amber-500"
                      />
                      {customPrices[getItemApiId(selectedItem, enchantment)] !== undefined && (
                        <button
                          onClick={() => handleResetCustomPrice(getItemApiId(selectedItem, enchantment))}
                          title={t.resetPrice}
                          className="p-1 text-slate-400 hover:text-amber-400"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="p-3.5 text-right font-mono text-emerald-400 text-sm">
                    {calcResult.netRevenue.toLocaleString()}
                  </td>
                </tr>

              </tbody>
            </table>
          </div>

          {/* Bottom Summary Bar */}
          <div className="p-4 bg-[#10131d] border-t border-[#262e42] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-xs text-slate-400">
              <div>
                <span>{t.totalCostsSum}: </span>
                <span className="font-mono font-bold text-slate-200">{calcResult.totalCost.toLocaleString()}</span>
              </div>
              <div>
                <span>{t.netRevenue}: </span>
                <span className="font-mono font-bold text-emerald-400">{calcResult.netRevenue.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                {t.netProfit}:
              </span>
              <span className={`text-xl font-black font-mono ${
                calcResult.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {calcResult.netProfit > 0 ? '+' : ''}{calcResult.netProfit.toLocaleString()} srebra
              </span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
