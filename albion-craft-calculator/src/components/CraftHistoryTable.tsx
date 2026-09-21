import React, { useState, useMemo } from 'react';
import { City, Language } from '../types/albion';
import { getItemRenderUrl } from '../services/albionApi';
import { 
  BookOpen, 
  ArrowRight, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Trash2, 
  Search, 
  Download, 
  Sparkles,
  Zap,
  Filter
} from 'lucide-react';

export interface CheckedCraftEntry {
  id: string;
  itemId: string;
  name: string;
  namePl: string;
  tier: number;
  enchantment: number;
  quality: number;
  craftCity: City;
  sellCity: City;
  useFocus: boolean;
  quantity: number;
  costPerItem: number;
  sellPricePerItem: number;
  profitPerItem: number;
  profitMarginPercent: number;
  totalProfit: number;
  isProfitable: boolean;
  journalsIncluded: boolean;
  journalProfit: number;
  timestamp: string;
}

interface CraftHistoryTableProps {
  history: CheckedCraftEntry[];
  language: Language;
  onClearHistory: () => void;
  onRemoveEntry: (id: string) => void;
  onLoadEntry: (entry: CheckedCraftEntry) => void;
}

const QUALITY_NAMES: Record<number, { pl: string; en: string }> = {
  1: { pl: 'Normalna', en: 'Normal' },
  2: { pl: 'Dobra', en: 'Good' },
  3: { pl: 'Znakomita', en: 'Outstanding' },
  4: { pl: 'Wybitna', en: 'Excellent' },
  5: { pl: 'Arcydzieło', en: 'Masterpiece' }
};

export const CraftHistoryTable: React.FC<CraftHistoryTableProps> = ({
  history,
  language,
  onClearHistory,
  onRemoveEntry,
  onLoadEntry
}) => {
  const [filterType, setFilterType] = useState<'all' | 'profitable' | 'unprofitable'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'time' | 'profitPerItem' | 'margin'>('time');

  const pl = language === 'pl';

  const t = {
    title: pl ? '📜 Kronika Przebadanych Receptur (Rejestr Zysków Druida)' : '📜 Checked Recipes Chronicle (Profit Ledger)',
    subtitle: pl 
      ? 'Automatyczny rejestr sprawdzanych przedmiotów, zysku na 1 sztuce i opłacalności craftu.'
      : 'Automatic ledger of inspected items, unit profit, and crafting profitability.',
    all: pl ? 'Wszystkie' : 'All',
    profitableOnly: pl ? 'Tylko Opłacalne' : 'Profitable Only',
    unprofitableOnly: pl ? 'Nieopłacalne' : 'Unprofitable Only',
    sortByLabel: pl ? 'Sortuj:' : 'Sort by:',
    sortNewest: pl ? 'Najnowsze' : 'Newest',
    sortHighestProfit: pl ? 'Najwyższy zysk / szt.' : 'Highest Unit Profit',
    sortHighestMargin: pl ? 'Najwyższa marża %' : 'Highest Margin %',
    searchPlaceholder: pl ? 'Szukaj w kronice...' : 'Filter history...',
    clearAll: pl ? 'Wyczyść kronikę' : 'Clear Ledger',
    exportCsv: pl ? 'Eksportuj CSV' : 'Export CSV',
    load: pl ? 'Wczytaj' : 'Load',
    emptyNotice: pl 
      ? 'Kronika jest pusta. Sprawdź dowolny przedmiot w kalkulatorze powyżej, a automatycznie zapisze się tutaj z wyliczonym zyskiem!'
      : 'The chronicle is empty. Check any item in the calculator above, and it will be recorded here automatically!',
    colItem: pl ? 'Przedmiot' : 'Item',
    colRoute: pl ? 'Trasa & Focus' : 'Route & Focus',
    colCostPerItem: pl ? 'Koszt 1 szt.' : 'Cost / item',
    colSellPrice: pl ? 'Cena sprzedaży' : 'Sell Price',
    colProfitPerItem: pl ? 'ZYSK NA 1 SZTUCE' : 'PROFIT PER ITEM',
    colMargin: pl ? 'Marża (ROI)' : 'Margin (ROI)',
    colStatus: pl ? 'Opłacalność' : 'Profitability',
    colTotalProfit: pl ? 'Łączny zysk' : 'Total Profit',
    colTime: pl ? 'Czas' : 'Time',
    colActions: pl ? 'Opcje' : 'Actions',
    statusProfitable: pl ? 'OPŁACA SIĘ' : 'PROFITABLE',
    statusLoss: pl ? 'STRATA' : 'LOSS',
  };

  // Filter and sort entries
  const filteredHistory = useMemo(() => {
    return history
      .filter((item) => {
        if (filterType === 'profitable' && !item.isProfitable) return false;
        if (filterType === 'unprofitable' && item.isProfitable) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          return (
            item.name.toLowerCase().includes(q) ||
            item.namePl.toLowerCase().includes(q) ||
            item.itemId.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'profitPerItem') return b.profitPerItem - a.profitPerItem;
        if (sortBy === 'margin') return b.profitMarginPercent - a.profitMarginPercent;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
  }, [history, filterType, searchQuery, sortBy]);

  const profitableCount = useMemo(() => history.filter(h => h.isProfitable).length, [history]);
  const unprofitableCount = useMemo(() => history.filter(h => !h.isProfitable).length, [history]);

  // Export to CSV
  const handleExportCsv = () => {
    if (history.length === 0) return;
    const headers = [
      'ID Przedmiotu',
      'Nazwa',
      'Tier',
      'Enchantment',
      'Jakość',
      'Miasto Craftu',
      'Miasto Sprzedaży',
      'Użyto Focusu',
      'Ilość',
      'Koszt 1 szt',
      'Cena sprzedaży 1 szt',
      'Zysk na 1 sztuce',
      'Marża ROI %',
      'Łączny Zysk',
      'Opłacalność',
      'Data'
    ];
    const rows = history.map(h => [
      h.itemId,
      `"${pl ? h.namePl : h.name}"`,
      h.tier,
      h.enchantment,
      h.quality,
      h.craftCity,
      h.sellCity,
      h.useFocus ? 'TAK' : 'NIE',
      h.quantity,
      h.costPerItem.toFixed(0),
      h.sellPricePerItem.toFixed(0),
      h.profitPerItem.toFixed(0),
      `${h.profitMarginPercent}%`,
      h.totalProfit.toFixed(0),
      h.isProfitable ? 'OPŁACALNE' : 'STRATA',
      `"${new Date(h.timestamp).toLocaleString()}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kronika_druida_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#0c2317] border border-[#1c4a33] rounded-2xl p-5 shadow-2xl space-y-4">
      
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#163d28]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 via-emerald-800 to-teal-950 flex items-center justify-center shadow-lg shadow-emerald-950/60 border border-emerald-400/50 flex-shrink-0">
            <BookOpen className="w-5 h-5 text-emerald-200" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold font-albion text-emerald-300 flex items-center gap-2">
              <span>{t.title}</span>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {history.length}
              </span>
            </h3>
            <p className="text-xs text-emerald-400/70">{t.subtitle}</p>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <>
              <button
                onClick={handleExportCsv}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#091d13] text-emerald-300 border border-[#1c4a33] hover:border-emerald-400 hover:text-emerald-100 transition-all flex items-center gap-1.5"
                title={t.exportCsv}
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.exportCsv}</span>
              </button>

              <button
                onClick={() => {
                  if (window.confirm(pl ? 'Czy na pewno chcesz wyczyścić całą kronikę?' : 'Are you sure you want to clear the ledger?')) {
                    onClearHistory();
                  }
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-red-950/30 text-red-400 border border-red-800/40 hover:bg-red-900/40 transition-all flex items-center gap-1.5"
                title={t.clearAll}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.clearAll}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters & Search Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        
        {/* Quick Tabs */}
        <div className="flex items-center bg-[#07170f] border border-[#143b27] rounded-xl p-1 gap-1">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              filterType === 'all'
                ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/50 shadow font-bold'
                : 'text-emerald-300/60 hover:text-emerald-200'
            }`}
          >
            <span>{t.all}</span>
            <span className="text-[10px] px-1 rounded bg-black/40 text-emerald-400">{history.length}</span>
          </button>

          <button
            onClick={() => setFilterType('profitable')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              filterType === 'profitable'
                ? 'bg-emerald-600 text-black font-bold shadow'
                : 'text-emerald-400/70 hover:text-emerald-300'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>{t.profitableOnly}</span>
            <span className="text-[10px] px-1 rounded bg-black/40 text-emerald-300">{profitableCount}</span>
          </button>

          <button
            onClick={() => setFilterType('unprofitable')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              filterType === 'unprofitable'
                ? 'bg-red-600 text-white font-bold shadow'
                : 'text-red-400/70 hover:text-red-300'
            }`}
          >
            <XCircle className="w-3 h-3 text-red-400" />
            <span>{t.unprofitableOnly}</span>
            <span className="text-[10px] px-1 rounded bg-black/40 text-red-300">{unprofitableCount}</span>
          </button>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
          
          {/* Search in History */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-8 pr-3 py-1.5 bg-[#07170f] border border-[#143b27] rounded-xl text-xs text-emerald-200 placeholder-emerald-600 focus:outline-none focus:border-emerald-400"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-[#07170f] border border-[#143b27] px-2.5 py-1.5 rounded-xl text-xs text-emerald-300">
            <Filter className="w-3 h-3 text-emerald-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs text-emerald-200 focus:outline-none cursor-pointer"
            >
              <option value="time" className="bg-[#07170f] text-emerald-200">{t.sortNewest}</option>
              <option value="profitPerItem" className="bg-[#07170f] text-emerald-200">{t.sortHighestProfit}</option>
              <option value="margin" className="bg-[#07170f] text-emerald-200">{t.sortHighestMargin}</option>
            </select>
          </div>

        </div>
      </div>

      {/* History Table */}
      {filteredHistory.length === 0 ? (
        <div className="p-8 text-center bg-[#07170f]/70 border border-[#143b27] rounded-xl text-emerald-400/60 text-xs">
          <div className="text-3xl mb-2">📜</div>
          <p>{t.emptyNotice}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#163d28]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#07170f] text-emerald-400/80 border-b border-[#163d28] font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-3">{t.colItem}</th>
                <th className="p-3">{t.colRoute}</th>
                <th className="p-3 text-right">{t.colCostPerItem}</th>
                <th className="p-3 text-right">{t.colSellPrice}</th>
                <th className="p-3 text-right text-emerald-300 font-extrabold bg-emerald-950/20">{t.colProfitPerItem}</th>
                <th className="p-3 text-right">{t.colMargin}</th>
                <th className="p-3 text-center">{t.colStatus}</th>
                <th className="p-3 text-right">{t.colTotalProfit}</th>
                <th className="p-3 text-right">{t.colTime}</th>
                <th className="p-3 text-center">{t.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#143b27]">
              {filteredHistory.map((item) => {
                const apiId = item.enchantment > 0 ? `${item.itemId}@${item.enchantment}` : item.itemId;
                const isProf = item.isProfitable;
                const dateObj = new Date(item.timestamp);
                const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-[#0f2c1d]/60 transition-colors ${
                      isProf ? 'bg-emerald-950/10' : 'bg-red-950/10'
                    }`}
                  >
                    {/* Item visual + name */}
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="relative flex-shrink-0">
                          <img
                            src={getItemRenderUrl(apiId, item.quality)}
                            alt={item.name}
                            className="w-9 h-9 object-contain rounded-lg bg-[#050e09] border border-[#163d28]"
                            loading="lazy"
                          />
                          <span className={`absolute -top-1 -left-1 text-[9px] font-bold px-1 rounded tier-badge-${item.tier}`}>
                            T{item.tier}.{item.enchantment}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-emerald-100 truncate max-w-[180px]" title={pl ? item.namePl : item.name}>
                            {pl ? item.namePl : item.name}
                          </div>
                          <div className="text-[10px] text-emerald-400/60 flex items-center gap-1">
                            {item.quality > 1 && (
                              <span className="text-amber-400 font-semibold">
                                {QUALITY_NAMES[item.quality] ? (pl ? QUALITY_NAMES[item.quality].pl : QUALITY_NAMES[item.quality].en) : `Q${item.quality}`}
                              </span>
                            )}
                            <span>• {item.quantity} szt. w partii</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Route & Focus */}
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-medium">
                        <span>{item.craftCity}</span>
                        <ArrowRight className="w-3 h-3 text-emerald-500/60 flex-shrink-0" />
                        <span className="text-amber-300">{item.sellCity}</span>
                      </div>
                      <div className="text-[10px] text-emerald-400/70 flex items-center gap-1 mt-0.5">
                        {item.useFocus ? (
                          <span className="text-teal-300 font-semibold flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5" /> Focus ON
                          </span>
                        ) : (
                          <span className="text-slate-500">Bez Focusu</span>
                        )}
                        {item.journalsIncluded && item.journalProfit > 0 && (
                          <span className="text-purple-300 flex items-center gap-0.5">
                            • 📜 Dzienniki +{item.journalProfit.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Cost per unit */}
                    <td className="p-3 text-right font-mono text-slate-300 whitespace-nowrap">
                      {item.costPerItem.toLocaleString()}
                    </td>

                    {/* Sell price per unit */}
                    <td className="p-3 text-right font-mono text-amber-300 whitespace-nowrap">
                      {item.sellPricePerItem.toLocaleString()}
                    </td>

                    {/* PROFIT PER SINGLE ITEM (KEY HIGHLIGHT COLUMN) */}
                    <td className={`p-3 text-right font-mono font-black text-sm whitespace-nowrap bg-emerald-950/20 ${
                      isProf ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      <div className="flex items-center justify-end gap-1">
                        <span>{item.profitPerItem > 0 ? '+' : ''}{item.profitPerItem.toLocaleString()}</span>
                        <span className="text-[10px] font-sans font-normal opacity-70">srebra</span>
                      </div>
                    </td>

                    {/* Margin (ROI) */}
                    <td className={`p-3 text-right font-mono font-bold whitespace-nowrap ${
                      item.profitMarginPercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {item.profitMarginPercent > 0 ? '+' : ''}{item.profitMarginPercent}%
                    </td>

                    {/* Profitability Badge */}
                    <td className="p-3 text-center whitespace-nowrap">
                      {isProf ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          {t.statusProfitable}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950/40 text-red-400 border border-red-700/40">
                          <XCircle className="w-3 h-3 text-red-400" />
                          {t.statusLoss}
                        </span>
                      )}
                    </td>

                    {/* Total Profit */}
                    <td className={`p-3 text-right font-mono font-semibold whitespace-nowrap ${
                      isProf ? 'text-emerald-300' : 'text-red-300'
                    }`}>
                      {item.totalProfit > 0 ? '+' : ''}{item.totalProfit.toLocaleString()}
                    </td>

                    {/* Timestamp */}
                    <td className="p-3 text-right text-emerald-500/70 font-mono text-[11px] whitespace-nowrap" title={dateObj.toLocaleString()}>
                      {timeStr}
                    </td>

                    {/* Action buttons */}
                    <td className="p-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onLoadEntry(item)}
                          className="px-2 py-1 rounded-lg bg-emerald-600/25 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500 hover:text-black font-semibold text-[11px] transition-all flex items-center gap-1"
                          title={pl ? 'Wczytaj tę recepturę do kalkulatora' : 'Load this recipe into planner'}
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{t.load}</span>
                        </button>
                        <button
                          onClick={() => onRemoveEntry(item.id)}
                          className="p-1 text-red-400/60 hover:text-red-400 hover:bg-red-950/40 rounded transition-colors"
                          title={pl ? 'Usuń z kroniki' : 'Remove from history'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};
