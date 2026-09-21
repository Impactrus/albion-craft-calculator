import React, { useState, useMemo } from 'react';
import {
  AlbionItem,
  UserCraftSettings,
  PriceRecord,
  Language,
  JournalTierInfo
} from '../types/albion';
import { calculateCrafting } from '../services/calculator';
import { getItemRenderUrl, getItemApiId } from '../services/albionApi';
import { TrendingUp, RefreshCw, Zap, ArrowRight, Filter, Search, Award } from 'lucide-react';

interface ProfitScannerProps {
  items: AlbionItem[];
  cityBonuses: Record<string, { refining: string[]; crafting: string[] }>;
  journalData: Record<string, Record<string, JournalTierInfo>>;
  settings: UserCraftSettings;
  priceMap: Map<string, PriceRecord[]>;
  onRefreshPrices: (itemIds: string[]) => Promise<void>;
  isLoadingPrices: boolean;
  language: Language;
  onSelectIntoPlanner: (itemId: string, enchantment: number) => void;
}

type SortField = 'profit' | 'margin' | 'silverFocus' | 'cost';

export const ProfitScanner: React.FC<ProfitScannerProps> = ({
  items,
  cityBonuses,
  journalData,
  settings,
  priceMap,
  onRefreshPrices,
  isLoadingPrices,
  language,
  onSelectIntoPlanner,
}) => {
  const [category, setCategory] = useState<string>('weapons');
  const [tier, setTier] = useState<number>(4);
  const [enchantment, setEnchantment] = useState<number>(0);
  const [sortField, setSortField] = useState<SortField>('profit');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Candidates for scanning
  const candidateItems = useMemo(() => {
    return items.filter((it) => {
      if (category !== 'all' && it.category !== category) return false;
      if (tier !== 0 && it.tier !== tier) return false;
      if (it.recipes[String(enchantment)] === undefined && it.recipes['0'] === undefined) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return it.name.toLowerCase().includes(q) || it.name_pl.toLowerCase().includes(q);
      }
      return true;
    }).slice(0, 100); // limit for performance
  }, [items, category, tier, enchantment, searchTerm]);

  // Compute results
  const scanResults = useMemo(() => {
    const list = [];
    for (const item of candidateItems) {
      const result = calculateCrafting(
        item,
        enchantment,
        1,
        settings,
        priceMap,
        {},
        cityBonuses,
        journalData
      );
      list.push({
        item,
        enchantment,
        result
      });
    }

    // Sort list
    list.sort((a, b) => {
      if (sortField === 'profit') return b.result.netProfit - a.result.netProfit;
      if (sortField === 'margin') return b.result.profitMarginPercent - a.result.profitMarginPercent;
      if (sortField === 'silverFocus') return b.result.silverPerFocus - a.result.silverPerFocus;
      if (sortField === 'cost') return a.result.totalCost - b.result.totalCost;
      return 0;
    });

    return list;
  }, [candidateItems, enchantment, settings, priceMap, cityBonuses, journalData, sortField]);

  // Scan prices button
  const handleScanPrices = async () => {
    const idsToFetch: string[] = [];
    for (const item of candidateItems) {
      idsToFetch.push(getItemApiId(item, enchantment));
      const recipe = item.recipes[String(enchantment)] || item.recipes['0'];
      if (recipe && recipe.resources) {
        recipe.resources.forEach((r) => idsToFetch.push(r.id));
      }
    }
    await onRefreshPrices(idsToFetch);
  };

  const t = {
    title: language === 'pl' ? 'Skaner Opłacalności Craftingu' : 'Crafting Profit Scanner',
    subtitle: language === 'pl' 
      ? `Znajdź przedmioty generujące najwyższy zysk lub najlepszy przelicznik Silver/Focus w mieście ${settings.craftCity}` 
      : `Discover the most profitable items or highest Silver/Focus craft in ${settings.craftCity}`,
    scanPrices: language === 'pl' ? 'Odśwież ceny z lokalnej bazy' : 'Refresh from Local DB',
    sortBy: language === 'pl' ? 'Sortuj według' : 'Sort by',
    profit: language === 'pl' ? 'Zysk netto (Srebro)' : 'Net Profit (Silver)',
    margin: language === 'pl' ? 'Marża % (ROI)' : 'Margin % (ROI)',
    silverFocus: language === 'pl' ? 'Srebro / Focus' : 'Silver / Focus',
    cost: language === 'pl' ? 'Koszt początkowy' : 'Investment Cost',
    item: language === 'pl' ? 'Przedmiot' : 'Item',
    sellPrice: language === 'pl' ? 'Cena sprzedaży' : 'Sell Price',
    plan: language === 'pl' ? 'Otwórz' : 'Open',
  };

  return (
    <div className="space-y-6">
      
      {/* Scanner Filter & Controls */}
      <div className="bg-[#141824] border border-[#262e42] rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              {t.title}
            </h2>
            <p className="text-xs text-slate-400">{t.subtitle}</p>
          </div>

          <button
            onClick={handleScanPrices}
            disabled={isLoadingPrices || candidateItems.length === 0}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold text-xs transition flex items-center gap-2 shadow-md shadow-amber-950/40 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPrices ? 'animate-spin' : ''}`} />
            {t.scanPrices} ({candidateItems.length})
          </button>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-[#23283b]">
          
          {/* Category */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Kategoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-[#0f121a] border border-[#2b334a] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Wszystkie</option>
              <option value="weapons">Broń (Weapons)</option>
              <option value="equipment">Pancerze (Armor)</option>
              <option value="consumables">Mikstury & Żywność</option>
              <option value="refining">Przetwórstwo (Refining)</option>
            </select>
          </div>

          {/* Tier */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Tier</label>
            <select
              value={tier}
              onChange={(e) => setTier(Number(e.target.value))}
              className="w-full py-1.5 px-2.5 bg-[#0f121a] border border-[#2b334a] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value={0}>Wszystkie</option>
              <option value={4}>Tier 4 (Adept)</option>
              <option value={5}>Tier 5 (Ekspert)</option>
              <option value={6}>Tier 6 (Mistrz)</option>
              <option value={7}>Tier 7 (Arcymistrz)</option>
              <option value={8}>Tier 8 (Starszy)</option>
            </select>
          </div>

          {/* Enchantment */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Zaklinanie</label>
            <select
              value={enchantment}
              onChange={(e) => setEnchantment(Number(e.target.value))}
              className="w-full py-1.5 px-2.5 bg-[#0f121a] border border-[#2b334a] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value={0}>.0 (Normal)</option>
              <option value={1}>.1 (Zielone)</option>
              <option value={2}>.2 (Niebieskie)</option>
              <option value={3}>.3 (Fioletowe)</option>
              <option value={4}>.4 (Złote)</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">{t.sortBy}</label>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="w-full py-1.5 px-2.5 bg-[#0f121a] border border-[#2b334a] rounded-lg text-xs font-semibold text-amber-300 focus:outline-none focus:border-amber-500"
            >
              <option value="profit">{t.profit}</option>
              <option value="margin">{t.margin}</option>
              <option value="silverFocus">{t.silverFocus}</option>
              <option value="cost">{t.cost}</option>
            </select>
          </div>

          {/* Search by text */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Filtruj nazwę</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="np. Miecz, Claymore..."
              className="w-full py-1.5 px-2.5 bg-[#0f121a] border border-[#2b334a] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

        </div>
      </div>

      {/* Results Table */}
      <div className="bg-[#141824] border border-[#262e42] rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#262e42] text-slate-400 bg-[#121520] uppercase text-[10px] tracking-wider">
                <th className="p-3.5">#</th>
                <th className="p-3.5">{t.item}</th>
                <th className="p-3.5 text-right">{t.cost}</th>
                <th className="p-3.5 text-right">{t.sellPrice}</th>
                <th className="p-3.5 text-right font-bold text-amber-400">{t.profit}</th>
                <th className="p-3.5 text-right">{t.margin}</th>
                <th className="p-3.5 text-right">{t.silverFocus}</th>
                <th className="p-3.5 text-center">Akcja</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#1e2433] text-slate-200">
              {scanResults.map(({ item, enchantment, result }, idx) => {
                const isProfitable = result.netProfit > 0;
                return (
                  <tr key={`${item.id}_${enchantment}`} className="hover:bg-[#181c2b] transition">
                    
                    {/* Rank */}
                    <td className="p-3.5 font-mono text-slate-500 text-xs">
                      {idx + 1}
                    </td>

                    {/* Item */}
                    <td className="p-3.5 flex items-center gap-3">
                      <img
                        src={getItemRenderUrl(getItemApiId(item, enchantment))}
                        alt={item.name}
                        className="w-9 h-9 rounded bg-[#0b0d13] border border-[#2b334a] p-0.5 object-contain"
                        loading="lazy"
                      />
                      <div>
                        <div className="font-bold flex items-center gap-1.5">
                          <span className={`text-[10px] px-1.5 py-0.2 rounded tier-badge-${item.tier}`}>
                            T{item.tier}.{enchantment}
                          </span>
                          <span className="text-slate-100">
                            {language === 'pl' ? item.name_pl : item.name}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.subcategory}
                        </div>
                      </div>
                    </td>

                    {/* Cost */}
                    <td className="p-3.5 text-right font-mono text-slate-300">
                      {result.totalCost.toLocaleString()}
                    </td>

                    {/* Sell Price */}
                    <td className="p-3.5 text-right font-mono text-slate-300">
                      {result.unitSellPrice.toLocaleString()}
                    </td>

                    {/* Net Profit */}
                    <td className="p-3.5 text-right font-mono font-bold">
                      <span className={isProfitable ? 'text-emerald-400' : 'text-red-400'}>
                        {result.netProfit > 0 ? '+' : ''}{result.netProfit.toLocaleString()}
                      </span>
                    </td>

                    {/* Margin */}
                    <td className="p-3.5 text-right font-mono font-semibold">
                      <span className={isProfitable ? 'text-emerald-400' : 'text-red-400'}>
                        {result.profitMarginPercent > 0 ? '+' : ''}{result.profitMarginPercent}%
                      </span>
                    </td>

                    {/* Silver/Focus */}
                    <td className="p-3.5 text-right font-mono font-bold text-amber-400">
                      {result.silverPerFocus > 0 ? `${result.silverPerFocus}` : '—'}
                    </td>

                    {/* Action */}
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => onSelectIntoPlanner(item.id, enchantment)}
                        className="px-2.5 py-1 bg-[#1e2436] hover:bg-amber-500 hover:text-black text-amber-300 border border-amber-500/30 rounded text-xs font-semibold transition flex items-center gap-1 mx-auto"
                      >
                        {t.plan}
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
