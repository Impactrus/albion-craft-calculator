import React, { useState, useMemo } from 'react';
import {
  AlbionItem,
  City,
  UserCraftSettings,
  PriceRecord,
  Language,
  JournalTierInfo
} from '../types/albion';
import { calculateCrafting } from '../services/calculator';
import { getItemRenderUrl, getItemApiId } from '../services/albionApi';
import { Sparkles, RefreshCw, Zap, TrendingUp, TrendingDown, ArrowRight, ShieldCheck } from 'lucide-react';

interface RefiningCalculatorProps {
  items: AlbionItem[];
  cityBonuses: Record<string, { refining: string[]; crafting: string[] }>;
  journalData: Record<string, Record<string, JournalTierInfo>>;
  settings: UserCraftSettings;
  onUpdateSettings: (newSettings: Partial<UserCraftSettings>) => void;
  priceMap: Map<string, PriceRecord[]>;
  onRefreshPrices: (itemIds: string[]) => Promise<void>;
  isLoadingPrices: boolean;
  language: Language;
  onSelectIntoPlanner: (itemId: string, enchantment: number) => void;
}

type ResourceType = 'wood' | 'ore' | 'hide' | 'fiber' | 'stone';

const REFINING_META: Record<ResourceType, { namePl: string; nameEn: string; bonusCity: City; itemPrefix: string }> = {
  wood: { namePl: 'Drewno (Deski / Planks)', nameEn: 'Wood (Planks)', bonusCity: 'Fort Sterling', itemPrefix: 'PLANKS' },
  ore: { namePl: 'Ruda (Sztaby / Metal Bars)', nameEn: 'Ore (Metal Bars)', bonusCity: 'Thetford', itemPrefix: 'METALBAR' },
  hide: { namePl: 'Skóra (Rzemienie / Leather)', nameEn: 'Hide (Leather)', bonusCity: 'Martlock', itemPrefix: 'LEATHER' },
  fiber: { namePl: 'Włókno (Tkaniny / Cloth)', nameEn: 'Fiber (Cloth)', bonusCity: 'Lymhurst', itemPrefix: 'CLOTH' },
  stone: { namePl: 'Kamień (Bloki / Stone Blocks)', nameEn: 'Stone (Stone Blocks)', bonusCity: 'Bridgewatch', itemPrefix: 'STONEBLOCK' },
};

export const RefiningCalculator: React.FC<RefiningCalculatorProps> = ({
  items,
  cityBonuses,
  journalData,
  settings,
  onUpdateSettings,
  priceMap,
  onRefreshPrices,
  isLoadingPrices,
  language,
  onSelectIntoPlanner,
}) => {
  const [selectedResource, setSelectedResource] = useState<ResourceType>('wood');
  const [batchQuantity, setBatchQuantity] = useState<number>(100);

  const meta = REFINING_META[selectedResource];

  // Filter refining items for the selected resource type
  const resourceItems = useMemo(() => {
    return items.filter((it) => {
      if (it.category !== 'refining') return false;
      return it.id.includes(meta.itemPrefix);
    }).sort((a, b) => a.tier - b.tier);
  }, [items, meta.itemPrefix]);

  // Compute refining calculations for all items and enchantments
  const refiningRows = useMemo(() => {
    const rows = [];

    for (const item of resourceItems) {
      const enchantments = Object.keys(item.recipes).map(Number).sort();
      for (const enc of enchantments) {
        const result = calculateCrafting(
          item,
          enc,
          batchQuantity,
          settings,
          priceMap,
          {},
          cityBonuses,
          journalData
        );
        rows.push({
          item,
          enchantment: enc,
          result
        });
      }
    }

    return rows;
  }, [resourceItems, batchQuantity, settings, priceMap, cityBonuses, journalData]);

  // Fetch prices for all items in the selected resource table
  const handleFetchAllRefiningPrices = async () => {
    const idsToFetch: string[] = [];

    for (const item of resourceItems) {
      const enchantments = Object.keys(item.recipes).map(Number);
      for (const enc of enchantments) {
        idsToFetch.push(getItemApiId(item, enc));
        const recipe = item.recipes[String(enc)] || item.recipes['0'];
        if (recipe && recipe.resources) {
          recipe.resources.forEach((r) => idsToFetch.push(r.id));
        }
      }
    }

    await onRefreshPrices(idsToFetch);
  };

  const t = {
    title: language === 'pl' ? 'Kalkulator Przetwórstwa (Refining Calculator)' : 'Refining Profit Calculator',
    subtitle: language === 'pl' 
      ? `Optymalne miasto z bonusem: ${meta.bonusCity} (RRR: 36.7% / 53.9% z focusem)`
      : `Optimal bonus city: ${meta.bonusCity} (RRR: 36.7% / 53.9% with focus)`,
    switchToBonusCity: language === 'pl' ? `Ustaw ${meta.bonusCity} jako miasto craftu` : `Set ${meta.bonusCity} as craft city`,
    fetchAllPrices: language === 'pl' ? 'Odśwież z lokalnej bazy cen' : 'Refresh from Local DB',
    tierEnc: language === 'pl' ? 'Stopień (Tier)' : 'Tier',
    inputCost: language === 'pl' ? 'Koszt netto' : 'Net Cost',
    outputRev: language === 'pl' ? 'Przychód netto' : 'Net Revenue',
    netProfit: language === 'pl' ? 'Zysk netto' : 'Net Profit',
    margin: language === 'pl' ? 'Marża' : 'Margin',
    silverFocus: language === 'pl' ? 'Srebro/Focus' : 'Silver/Focus',
    action: language === 'pl' ? 'Opcje' : 'Action',
    planButton: language === 'pl' ? 'Planuj' : 'Plan',
  };

  return (
    <div className="space-y-6">
      
      {/* Resource Type Selector Bar */}
      <div className="bg-[#141824] border border-[#262e42] rounded-xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4">
        
        {/* Resource Buttons */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(REFINING_META) as ResourceType[]).map((resType) => {
            const m = REFINING_META[resType];
            const isSelected = selectedResource === resType;
            return (
              <button
                key={resType}
                onClick={() => setSelectedResource(resType)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-950/40'
                    : 'bg-[#181c2b] text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                <span>{language === 'pl' ? m.namePl.split(' ')[0] : m.nameEn.split(' ')[0]}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${isSelected ? 'bg-black/20 text-black' : 'bg-[#0f1117] text-amber-400'}`}>
                  {m.bonusCity}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Batch Quantity & Refresh */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#0f121a] border border-[#2b334a] rounded-lg px-2.5 py-1.5 text-xs">
            <span className="text-slate-400">Ilość:</span>
            <input
              type="number"
              min="1"
              max="50000"
              value={batchQuantity}
              onChange={(e) => setBatchQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 bg-transparent text-amber-300 font-mono text-center focus:outline-none"
            />
          </div>

          <button
            onClick={handleFetchAllRefiningPrices}
            disabled={isLoadingPrices}
            className="px-3.5 py-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold hover:bg-amber-500/30 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPrices ? 'animate-spin' : ''}`} />
            {t.fetchAllPrices}
          </button>
        </div>

      </div>

      {/* Bonus City Banner */}
      <div className="bg-[#121622] border border-amber-500/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100">{t.title}</div>
            <div className="text-xs text-amber-300">{t.subtitle}</div>
          </div>
        </div>

        {settings.craftCity !== meta.bonusCity && (
          <button
            onClick={() => onUpdateSettings({ craftCity: meta.bonusCity })}
            className="px-3 py-1.5 rounded-lg bg-amber-500 text-black font-semibold text-xs hover:bg-amber-400 transition flex items-center gap-1 shadow"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {t.switchToBonusCity}
          </button>
        )}
      </div>

      {/* Refining Table */}
      <div className="bg-[#141824] border border-[#262e42] rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#262e42] text-slate-400 bg-[#121520] uppercase text-[10px] tracking-wider">
                <th className="p-3.5">{t.tierEnc}</th>
                <th className="p-3.5 text-right">{t.inputCost}</th>
                <th className="p-3.5 text-right">{t.outputRev}</th>
                <th className="p-3.5 text-right font-bold">{t.netProfit}</th>
                <th className="p-3.5 text-right">{t.margin}</th>
                <th className="p-3.5 text-right">{t.silverFocus}</th>
                <th className="p-3.5 text-center">{t.action}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#1e2433] text-slate-200">
              {refiningRows.map(({ item, enchantment, result }) => {
                const isProfitable = result.netProfit > 0;
                return (
                  <tr key={`${item.id}_${enchantment}`} className="hover:bg-[#181c2b] transition">
                    
                    {/* Item Visual & Tier */}
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
                          {batchQuantity} szt. (RRR: {result.returnRatePercent}%)
                        </div>
                      </div>
                    </td>

                    {/* Net Cost */}
                    <td className="p-3.5 text-right font-mono text-slate-300">
                      {result.totalCost.toLocaleString()}
                    </td>

                    {/* Net Revenue */}
                    <td className="p-3.5 text-right font-mono text-slate-300">
                      {result.netRevenue.toLocaleString()}
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

                    {/* Silver per focus */}
                    <td className="p-3.5 text-right font-mono font-bold text-amber-400">
                      {result.silverPerFocus > 0 ? `${result.silverPerFocus}` : '—'}
                    </td>

                    {/* Action */}
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => onSelectIntoPlanner(item.id, enchantment)}
                        className="px-2.5 py-1 bg-[#1e2436] hover:bg-amber-500 hover:text-black text-amber-300 border border-amber-500/30 rounded text-xs font-semibold transition flex items-center gap-1 mx-auto"
                      >
                        {t.planButton}
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
