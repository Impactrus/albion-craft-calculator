import React from 'react';
import { ServerRegion, Language, City } from '../types/albion';
import { Hammer, Sparkles, TrendingUp, ShoppingBag, Settings, Globe, Shield, Radio } from 'lucide-react';

interface NavbarProps {
  activeTab: 'planner' | 'refining' | 'scanner' | 'captured';
  setActiveTab: (tab: 'planner' | 'refining' | 'scanner' | 'captured') => void;
  server: ServerRegion;
  setServer: (server: ServerRegion) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  hasPremium: boolean;
  setHasPremium: (premium: boolean) => void;
  onOpenSettings: () => void;
  snifferStatus: 'connected' | 'disconnected';
  capturedCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  server,
  setServer,
  language,
  setLanguage,
  hasPremium,
  setHasPremium,
  onOpenSettings,
  snifferStatus,
  capturedCount,
}) => {
  const t = {
    title: language === 'pl' ? 'Albion Crafting' : 'Albion Crafting',
    subtitle: language === 'pl' ? 'Kalkulator & Planner' : 'Calculator & Planner',
    planner: language === 'pl' ? 'Kalkulator Craftingu' : 'Craft Planner',
    refining: language === 'pl' ? 'Przetwórstwo (Refining)' : 'Refining',
    scanner: language === 'pl' ? 'Skaner Zysku' : 'Profit Scanner',
    captured: language === 'pl' ? 'Przechwycone Ceny' : 'Live Feed',
    server: language === 'pl' ? 'Serwer' : 'Server',
    premium: language === 'pl' ? 'Konto Premium' : 'Premium Account',
    settings: language === 'pl' ? 'Ustawienia' : 'Settings',
  };

  return (
    <header className="bg-[#12151e] border-b border-[#262c3d] sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('planner')}>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-md shadow-amber-900/30 border border-amber-400/40">
              <Hammer className="w-6 h-6 text-black font-bold" />
            </div>
            <div>
              <div className="text-xl font-bold font-albion tracking-wider text-amber-400 drop-shadow flex items-center gap-2">
                {t.title}
                <span className="text-[10px] font-sans font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  FREE
                </span>
              </div>
              <div className="text-xs text-slate-400">{t.subtitle}</div>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden md:flex space-x-1">
            <button
              onClick={() => setActiveTab('planner')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'planner'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Hammer className="w-4 h-4" />
              {t.planner}
            </button>

            <button
              onClick={() => setActiveTab('refining')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'refining'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              {t.refining}
            </button>

            <button
              onClick={() => setActiveTab('scanner')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'scanner'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              {t.scanner}
            </button>

            <button
              onClick={() => setActiveTab('captured')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'captured'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Radio className={`w-4 h-4 ${snifferStatus === 'connected' ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>{t.captured}</span>
              {capturedCount > 0 && (
                <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/40">
                  {capturedCount}
                </span>
              )}
            </button>
          </nav>

          {/* Right side controls: Sniffer, Server, Premium, Language, Settings */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Live Packet Sniffer Indicator */}
            <div
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                snifferStatus === 'connected'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-950'
                  : 'bg-slate-800/60 text-slate-500 border-slate-700'
              }`}
              title={
                snifferStatus === 'connected'
                  ? 'Mostek przechwytywania pakietów z gry jest aktywny! Ceny będą się aktualizować w locie.'
                  : 'Mostek pakietów offline. Uruchom URUCHOM_ZE_SNIFFEREM.bat aby włączyć automatyczne skanowanie z gry.'
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  snifferStatus === 'connected' ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'
                }`}
              />
              <span className="hidden sm:inline">
                {snifferStatus === 'connected' ? 'Sniffer LIVE' : 'Sniffer OFF'}
              </span>
            </div>

            {/* Server Region Selector */}
            <div className="flex items-center bg-[#181c28] border border-[#2b3145] rounded-lg p-0.5">
              {(['europe', 'west', 'east'] as ServerRegion[]).map((reg) => (
                <button
                  key={reg}
                  onClick={() => setServer(reg)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded uppercase transition-all ${
                    server === reg
                      ? 'bg-amber-500 text-black shadow font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={`Serwer: ${reg}`}
                >
                  {reg === 'europe' ? 'EU' : reg === 'west' ? 'US' : 'ASIA'}
                </button>
              ))}
            </div>

            {/* Premium toggle */}
            <button
              onClick={() => setHasPremium(!hasPremium)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                hasPremium
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title={t.premium}
            >
              <Shield className={`w-3.5 h-3.5 ${hasPremium ? 'text-amber-400' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">Premium:</span> {hasPremium ? '4%' : '8%'}
            </button>

            {/* Language toggle */}
            <button
              onClick={() => setLanguage(language === 'pl' ? 'en' : 'pl')}
              className="px-2 py-1.5 rounded-lg bg-[#181c28] border border-[#2b3145] text-xs font-semibold text-slate-300 hover:text-amber-400 transition-colors flex items-center gap-1"
              title="Zmień język / Switch Language"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{language.toUpperCase()}</span>
            </button>

            {/* Settings button */}
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-lg bg-[#181c28] border border-[#2b3145] text-slate-400 hover:text-amber-400 transition-colors"
              title={t.settings}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Mobile Tab Bar */}
        <div className="flex md:hidden border-t border-[#262c3d] py-2 space-x-1">
          <button
            onClick={() => setActiveTab('planner')}
            className={`flex-1 py-1.5 text-xs text-center rounded font-medium ${
              activeTab === 'planner' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400'
            }`}
          >
            {t.planner}
          </button>
          <button
            onClick={() => setActiveTab('refining')}
            className={`flex-1 py-1.5 text-xs text-center rounded font-medium ${
              activeTab === 'refining' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400'
            }`}
          >
            {t.refining}
          </button>
          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex-1 py-1.5 text-xs text-center rounded font-medium ${
              activeTab === 'scanner' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400'
            }`}
          >
            {t.scanner}
          </button>
          <button
            onClick={() => setActiveTab('captured')}
            className={`flex-1 py-1.5 text-xs text-center rounded font-medium ${
              activeTab === 'captured' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400'
            }`}
          >
            {t.captured} {capturedCount > 0 ? `(${capturedCount})` : ''}
          </button>
        </div>
      </div>
    </header>
  );
};
