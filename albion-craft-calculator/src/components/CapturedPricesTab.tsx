import React, { useState, useMemo } from "react";
import { CapturedMarketOrder, AlbionItem, Language } from "../types/albion";
import { getItemRenderUrl } from "../services/albionApi";
import { Radio, Search, Trash2, Building, Send, Zap } from "lucide-react";

interface CapturedPricesTabProps {
  orders: CapturedMarketOrder[];
  items: AlbionItem[];
  language: Language;
  onClearOrders: () => void;
  snifferStatus: "connected" | "disconnected";
  onSendTestPacket: () => Promise<void>;
}

const QUALITY_LABELS: Record<number, { pl: string; en: string; badgeColor: string }> = {
  1: { pl: "Normalna", en: "Normal", badgeColor: "bg-slate-700 text-slate-300" },
  2: { pl: "Dobra", en: "Good", badgeColor: "bg-emerald-950/60 border border-emerald-500/40 text-emerald-300" },
  3: { pl: "Znakomita", en: "Outstanding", badgeColor: "bg-blue-950/60 border border-blue-500/40 text-blue-300" },
  4: { pl: "Wybitna", en: "Excellent", badgeColor: "bg-purple-950/60 border border-purple-500/40 text-purple-300" },
  5: { pl: "Arcydzieło", en: "Masterpiece", badgeColor: "bg-amber-950/60 border border-amber-500/50 text-amber-300 font-bold" },
};

export const CapturedPricesTab: React.FC<CapturedPricesTabProps> = ({
  orders, items, language, onClearOrders, snifferStatus, onSendTestPacket,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedQuality, setSelectedQuality] = useState(0);
  const [isSendingTest, setIsSendingTest] = useState(false);

  const itemMap = useMemo(() => {
    const map = new Map<string, AlbionItem>();
    for (const it of items) map.set(it.id, it);
    return map;
  }, [items]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (selectedCity !== "all" && o.city.toLowerCase() !== selectedCity.toLowerCase()) return false;
      if (selectedType !== "all" && o.auction_type !== selectedType) return false;
      if (selectedQuality !== 0 && o.quality !== selectedQuality) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase().trim();
        const rawId = o.item_id.toLowerCase();
        const baseId = rawId.split("@")[0].split("_level")[0];
        const it = itemMap.get(baseId);
        const namePl = it ? it.name_pl.toLowerCase() : "";
        const nameEn = it ? it.name.toLowerCase() : "";
        return rawId.includes(q) || namePl.includes(q) || nameEn.includes(q);
      }
      return true;
    });
  }, [orders, selectedCity, selectedType, selectedQuality, searchTerm, itemMap]);

  const handleTestClick = async () => {
    setIsSendingTest(true);
    try { await onSendTestPacket(); }
    finally { setTimeout(() => setIsSendingTest(false), 500); }
  };

  const parseItemTierEnc = (rawId: string) => {
    const parts = rawId.split("@");
    const enc = parts.length > 1 ? Number(parts[1]) : 0;
    const tierMatch = rawId.match(/T(\d)/);
    const tier = tierMatch ? Number(tierMatch[1]) : 4;
    return { tier, enc };
  };

  const pl = language === "pl";
  const t = {
    title: pl ? "🦌 Leśny Zwiad Rynkowy (Pakiety na Żywo)" : "🦌 Forest Market Scouting (Live Feed)",
    subtitle: pl ? "Duch puszczy podsłuchuje targowiska Albionu i aktualizuje Twoją prywatną kronikę cen." : "The forest spirit overhears Albion markets and updates your private ledger.",
    snifferActive: pl ? "🌲 Duch Czuwa (Sniffer Live)" : "🌲 Spirit Awoken (Live)",
    snifferInactive: pl ? "🍂 Duch Uśpiony" : "🍂 Spirit Asleep",
    sendTest: pl ? "✨ Leśny impuls testowy" : "✨ Send Druidic Pulse",
    clear: pl ? "Wyczyść zwoje" : "Clear",
    searchPlaceholder: pl ? "Szukaj w leśnych zwojach (nazwa, ID)..." : "Filter by name or ID...",
    allCities: pl ? "Wszystkie miasta" : "All Cities",
    allTypes: pl ? "Wszystkie typy" : "All Types",
    allQualities: pl ? "Wszystkie jakości" : "All Qualities",
    sellOffer: pl ? "Sprzedaż" : "Sell",
    buyRequest: pl ? "Skup" : "Buy",
    itemCol: pl ? "Przedmiot" : "Item",
    cityCol: pl ? "Miasto" : "City",
    qualityCol: pl ? "Jakość" : "Quality",
    typeCol: pl ? "Typ" : "Type",
    amountCol: pl ? "Ilość" : "Amount",
    priceCol: pl ? "Cena / szt." : "Price / unit",
    timeCol: pl ? "Czas" : "Time",
    emptyNotice: pl
      ? "Zwoje są puste. Otwórz Albion Online i podejdź do tablicy rynku — leśny zwiad natychmiast przechwyci ceny!"
      : "Scrolls are blank. Open Albion Online and inspect marketplace — forest scouts will capture prices immediately!",
    autoSyncInfo: pl
      ? "Ceny wskakują automatycznie do Gaju Rzemiosła i Oka Druida — w 100% lokalnie i bez klikania!"
      : "Prices sync automatically into the Craft Grove and Druid Eye — 100% locally with zero clicks!",
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#141824] border border-[#262e42] rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-xl border flex items-center justify-center ${snifferStatus === "connected" ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-950" : "bg-slate-800/50 border-slate-700 text-slate-400"}`}>
              <Radio className={`w-6 h-6 ${snifferStatus === "connected" ? "animate-pulse" : ""}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">{t.title}</h2>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${snifferStatus === "connected" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-slate-800 text-slate-400 border-slate-700"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${snifferStatus === "connected" ? "bg-emerald-400 animate-ping" : "bg-slate-500"}`} />
                  {snifferStatus === "connected" ? t.snifferActive : t.snifferInactive}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{t.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button onClick={handleTestClick} disabled={isSendingTest} className="px-3.5 py-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold hover:bg-amber-500/30 transition flex items-center gap-1.5">
              <Send className={`w-3.5 h-3.5 ${isSendingTest ? "animate-bounce" : ""}`} />{t.sendTest}
            </button>
            {orders.length > 0 && (
              <button onClick={onClearOrders} className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-red-950/60 hover:text-red-300 hover:border-red-500/40 border border-slate-700 text-xs font-semibold text-slate-400 transition flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" />{t.clear} ({orders.length})
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300 font-semibold">{t.autoSyncInfo}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-[#23283b]">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t.searchPlaceholder}
              className="w-full pl-9 pr-3 py-1.5 bg-[#0f121a] border border-[#2b334a] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500" />
          </div>
          <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className="w-full py-1.5 px-2.5 bg-[#0f121a] border border-[#2b334a] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500">
            <option value="all">{t.allCities}</option>
            {["Fort Sterling","Thetford","Lymhurst","Bridgewatch","Martlock","Caerleon","Brecilien","Black Market"].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="w-full py-1.5 px-2.5 bg-[#0f121a] border border-[#2b334a] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500">
            <option value="all">{t.allTypes}</option>
            <option value="offer">{t.sellOffer}</option>
            <option value="request">{t.buyRequest}</option>
          </select>
          <select value={selectedQuality} onChange={(e) => setSelectedQuality(Number(e.target.value))} className="w-full py-1.5 px-2.5 bg-[#0f121a] border border-[#2b334a] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500">
            <option value={0}>{t.allQualities}</option>
            <option value={1}>Q1 — Normalna</option>
            <option value={2}>Q2 — Dobra</option>
            <option value={3}>Q3 — Znakomita</option>
            <option value={4}>Q4 — Wybitna</option>
            <option value={5}>Q5 — Arcydzieło</option>
          </select>
        </div>
      </div>

      <div className="bg-[#141824] border border-[#262e42] rounded-xl overflow-hidden shadow-lg">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Radio className="w-12 h-12 text-slate-600 mx-auto animate-pulse" />
            <div className="text-sm font-semibold text-slate-300">{t.emptyNotice}</div>
            <button onClick={handleTestClick} className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold hover:bg-amber-500/30 transition inline-flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" />{t.sendTest}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#262e42] text-slate-400 bg-[#121520] uppercase text-[10px] tracking-wider">
                  <th className="p-3.5">{t.itemCol}</th>
                  <th className="p-3.5">{t.qualityCol}</th>
                  <th className="p-3.5">{t.cityCol}</th>
                  <th className="p-3.5">{t.typeCol}</th>
                  <th className="p-3.5 text-center">{t.amountCol}</th>
                  <th className="p-3.5 text-right font-bold">{t.priceCol}</th>
                  <th className="p-3.5 text-right">{t.timeCol}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2433] text-slate-200">
                {filteredOrders.map((ord, idx) => {
                  const { tier, enc } = parseItemTierEnc(ord.item_id);
                  const baseId = ord.item_id.split("@")[0].split("_LEVEL")[0];
                  const itemInfo = itemMap.get(baseId);
                  const qInfo = QUALITY_LABELS[ord.quality] || QUALITY_LABELS[1];
                  const dateObj = new Date(ord.timestamp);
                  const timeStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleTimeString() : "przed chwilą";
                  const isSell = ord.auction_type === "offer";
                  return (
                    <tr key={`${ord.item_id}_${ord.city}_${ord.quality}_${idx}`} className="hover:bg-[#181c2b] transition">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img src={getItemRenderUrl(ord.item_id, ord.quality)} alt={ord.item_id} className="w-10 h-10 rounded bg-[#0b0d13] border border-[#2b334a] p-0.5 object-contain" loading="lazy" />
                          <div>
                            <div className="font-bold flex items-center gap-1.5">
                              <span className={`text-[10px] px-1.5 rounded tier-badge-${tier}`}>T{tier}.{enc}</span>
                              <span className="text-slate-100">{itemInfo ? (pl ? itemInfo.name_pl : itemInfo.name) : ord.item_id}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{ord.item_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5"><span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${qInfo.badgeColor}`}>{pl ? qInfo.pl : qInfo.en}</span></td>
                      <td className="p-3.5"><span className="font-semibold text-slate-200 flex items-center gap-1"><Building className="w-3.5 h-3.5 text-amber-400" />{ord.city}</span></td>
                      <td className="p-3.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${isSell ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-300" : "bg-blue-950/60 border border-blue-500/40 text-blue-300"}`}>
                          {isSell ? t.sellOffer : t.buyRequest}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-mono text-slate-300">{ord.amount}</td>
                      <td className="p-3.5 text-right font-mono font-black text-sm">
                        <span className={isSell ? "text-amber-300" : "text-blue-300"}>{ord.price.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400 ml-1">srebra</span>
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-400 text-[11px]">{timeStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
