import React from 'react';
import { UserCraftSettings, Language } from '../types/albion';
import { X, Sliders, DollarSign, Percent, Award, BookOpen, Building2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserCraftSettings;
  onUpdateSettings: (newSettings: Partial<UserCraftSettings>) => void;
  language: Language;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  language,
}) => {
  if (!isOpen) return null;

  const t = {
    title: language === 'pl' ? 'Ustawienia Craftingu i Podatków' : 'Crafting & Tax Settings',
    stationTax: language === 'pl' ? 'Podatek Stacji (Srebro / 100 Żywności)' : 'Station Fee (Silver / 100 Nutrition)',
    stationDesc: language === 'pl' ? 'Standardowa opłata w miastach królewskich (np. 300 - 800 srebra).' : 'Standard fee in royal cities (e.g. 300 - 800 silver).',
    marketSelling: language === 'pl' ? 'Typ sprzedaży gotowego przedmiotu' : 'Finished Product Sell Method',
    sellOrder: language === 'pl' ? 'Zlecenie sprzedaży (Sell Order, +2.5% opłaty)' : 'Sell Order (+2.5% setup fee)',
    directSell: language === 'pl' ? 'Sprzedaż natychmiastowa (Direct Sell, 0% opłaty)' : 'Direct Sell (0% setup fee)',
    materialBuying: language === 'pl' ? 'Sposób zakupu surowców' : 'Material Buying Method',
    buyOrder: language === 'pl' ? 'Zlecenie kupna (Buy Order, taniej, +2.5% opłaty)' : 'Buy Order (cheaper, +2.5% fee)',
    directBuy: language === 'pl' ? 'Zakup natychmiastowy (Direct Buy, z wystawionych ofert)' : 'Direct Buy (from market sell orders)',
    dailyBonus: language === 'pl' ? 'Dzienny Bonus Produkcji (Wydarzenie dzienne)' : 'Daily Production Bonus (Daily Event)',
    none: language === 'pl' ? 'Brak (0%)' : 'None (0%)',
    rrrOverride: language === 'pl' ? 'Własny % Zwrotu Surowców (RRR)' : 'Custom Resource Return Rate (RRR)',
    rrrAuto: language === 'pl' ? 'Automatycznie (wg miasta i fokusu)' : 'Auto (based on city & focus)',
    specsTitle: language === 'pl' ? 'Poziomy Specjalizacji (Focus Efficiency)' : 'Specialization & Mastery (Focus Efficiency)',
    masteryLevel: language === 'pl' ? 'Poziom Biegłości (Mastery 0-100)' : 'Mastery Level (0-100)',
    specLevel: language === 'pl' ? 'Poziom Specjalizacji (Spec 0-100)' : 'Specialization Level (0-100)',
    specDesc: language === 'pl' ? 'Wpływa na redukcję punktów Focusu potrzebnych na craft.' : 'Reduces the focus cost required per craft.',
    journals: language === 'pl' ? 'Dzienniki Rzemieślnicze (Journals)' : 'Crafting Journals',
    includeJournals: language === 'pl' ? 'Uwzględnij napełnianie pustych dzienników w zysku' : 'Include filling empty journals in profit calculation',
    save: language === 'pl' ? 'Zapisz i zamknij' : 'Save & Close',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#151924] border border-[#2b3347] rounded-xl max-w-xl w-full p-6 shadow-2xl relative my-8 animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#252c3f]">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-slate-100">{t.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 mt-5 max-h-[70vh] overflow-y-auto pr-1">
          
          {/* Station Nutrition Fee */}
          <div className="bg-[#1c2233] p-3.5 rounded-lg border border-[#2c354d]">
            <div className="flex items-center gap-2 mb-1.5">
              <Building2 className="w-4 h-4 text-amber-400" />
              <label className="text-sm font-semibold text-slate-200">{t.stationTax}</label>
            </div>
            <p className="text-xs text-slate-400 mb-2">{t.stationDesc}</p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="5000"
                step="50"
                value={settings.stationFeePer100Nutrition}
                onChange={(e) => onUpdateSettings({ stationFeePer100Nutrition: Number(e.target.value) || 0 })}
                className="w-36 bg-[#0f121a] border border-[#333d59] rounded px-3 py-1.5 text-sm text-amber-300 font-mono focus:outline-none focus:border-amber-500"
              />
              <span className="text-xs text-slate-400">srebra / 100 nutrition</span>
            </div>
          </div>

          {/* Market Sell & Buy Orders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Selling Method */}
            <div className="bg-[#1c2233] p-3.5 rounded-lg border border-[#2c354d]">
              <label className="text-xs font-semibold text-slate-300 block mb-2">{t.marketSelling}</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="sellOrderType"
                    checked={settings.sellOrderType === 'sell_order'}
                    onChange={() => onUpdateSettings({ sellOrderType: 'sell_order' })}
                    className="text-amber-500 focus:ring-amber-500"
                  />
                  <span>{t.sellOrder}</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="sellOrderType"
                    checked={settings.sellOrderType === 'direct_sell'}
                    onChange={() => onUpdateSettings({ sellOrderType: 'direct_sell' })}
                    className="text-amber-500 focus:ring-amber-500"
                  />
                  <span>{t.directSell}</span>
                </label>
              </div>
            </div>

            {/* Buying Method */}
            <div className="bg-[#1c2233] p-3.5 rounded-lg border border-[#2c354d]">
              <label className="text-xs font-semibold text-slate-300 block mb-2">{t.materialBuying}</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="buyOrderType"
                    checked={settings.buyOrderType === 'buy_order'}
                    onChange={() => onUpdateSettings({ buyOrderType: 'buy_order' })}
                    className="text-amber-500 focus:ring-amber-500"
                  />
                  <span>{t.buyOrder}</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="buyOrderType"
                    checked={settings.buyOrderType === 'direct_buy'}
                    onChange={() => onUpdateSettings({ buyOrderType: 'direct_buy' })}
                    className="text-amber-500 focus:ring-amber-500"
                  />
                  <span>{t.directBuy}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Daily production bonus */}
          <div className="bg-[#1c2233] p-3.5 rounded-lg border border-[#2c354d]">
            <label className="text-xs font-semibold text-slate-300 block mb-2">{t.dailyBonus}</label>
            <div className="flex items-center gap-4">
              {[0, 10, 20].map((bonus) => (
                <label key={bonus} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="dailyBonus"
                    checked={settings.dailyBonus === bonus}
                    onChange={() => onUpdateSettings({ dailyBonus: bonus })}
                    className="text-amber-500 focus:ring-amber-500"
                  />
                  <span>{bonus === 0 ? t.none : `+${bonus}%`}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom RRR override */}
          <div className="bg-[#1c2233] p-3.5 rounded-lg border border-[#2c354d]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">{t.rrrOverride}</label>
              <span className="text-xs font-mono text-amber-400">
                {settings.customRrr !== null ? `${settings.customRrr}%` : t.rrrAuto}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="60"
                step="0.5"
                value={settings.customRrr !== null ? settings.customRrr : 24.8}
                onChange={(e) => onUpdateSettings({ customRrr: Number(e.target.value) })}
                className="w-full accent-amber-500"
              />
              {settings.customRrr !== null && (
                <button
                  onClick={() => onUpdateSettings({ customRrr: null })}
                  className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-xs rounded text-slate-300 whitespace-nowrap"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Specs & Mastery */}
          <div className="bg-[#1c2233] p-3.5 rounded-lg border border-[#2c354d]">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-amber-400" />
              <label className="text-sm font-semibold text-slate-200">{t.specsTitle}</label>
            </div>
            <p className="text-xs text-slate-400 mb-3">{t.specDesc}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>{t.masteryLevel}</span>
                  <span className="font-mono text-amber-400">{settings.masteryLevel} / 100</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.masteryLevel}
                  onChange={(e) => onUpdateSettings({ masteryLevel: Number(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>{t.specLevel}</span>
                  <span className="font-mono text-amber-400">{settings.specLevel} / 100</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.specLevel}
                  onChange={(e) => onUpdateSettings({ specLevel: Number(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Journals Toggle */}
          <div className="bg-[#1c2233] p-3.5 rounded-lg border border-[#2c354d]">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.includeJournals}
                onChange={(e) => onUpdateSettings({ includeJournals: e.target.checked })}
                className="w-4 h-4 rounded text-amber-500 accent-amber-500 focus:ring-amber-500"
              />
              <div>
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  {t.journals}
                </div>
                <div className="text-[11px] text-slate-400">{t.includeJournals}</div>
              </div>
            </label>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-[#252c3f] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold text-sm rounded-lg transition shadow-md shadow-amber-950/40"
          >
            {t.save}
          </button>
        </div>

      </div>
    </div>
  );
};
