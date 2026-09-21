import React from 'react';
import { ServerRegion, Language, City } from '../types/albion';
import { Trees, Leaf, Sparkles, Compass, Settings, Globe, Shield, Radio } from 'lucide-react';

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
    title: language === 'pl' ? 'Leśne Centrum Dowodzenia Finansów Druida' : 'Druid Forest Financial Command',
    subtitle: language === 'pl' ? '🌿 Święty Gaj Rzemiosła, Runy Zysku & Skarbiec Albionu' : '🌿 Sacred Crafting Grove & Albion Vault',
    planner: language === 'pl' ? 'Gaj Rzemiosła' : 'Craft Grove',
    refining: language === 'pl' ? 'Przetwórstwo Żywiołów' : 'Elements Refining',
    scanner: language === 'pl' ? 'Oko Druida' : 'Druid Eye',
    captured: language === 'pl' ? 'Leśny Zwiad' : 'Forest Scout',
    server: language === 'pl' ? 'Serwer' : 'Server',
    premium: language === 'pl' ? 'Łaska Lasu (Premium)' : 'Forest Grace (Premium)',
    settings: language === 'pl' ? 'Pradawne Ustawienia' : 'Ancient Settings',
  };

  return (
    <header className="bg-[#091b12] border-b border-[#1b442f] sticky top-0 z-30 shadow-xl shadow-black/40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Druidic Brand Logo */}
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setActiveTab('planner')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 via-emerald-800 to-teal-950 flex items-center justify-center shadow-lg shadow-emerald-950/60 border border-emerald-400/50 group-hover:border-emerald-300 transition-all">
              <Trees className="w-6 h-6 text-emerald-200 drop-shadow group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <div className="text-base sm:text-lg font-bold font-albion tracking-wide text-emerald-300 drop-shadow flex items-center gap-2 group-hover:text-emerald-200 transition-colors">
                <span>{t.title}</span>
                <span className="text-[10px] font-sans font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hidden xl:inline-block">
                  DRUID v2
                </span>
              </div>
              <div className="text-[11px] text-emerald-400/70 font-medium">{t.subtitle}</div>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden md:flex space-x-1.5">
            <button
              onClick={() => setActiveTab('planner')}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'planner'
                  ? 'bg-emerald-700/30 text-emerald-300 border border-emerald-500/60 shadow-lg shadow-emerald-950/50 font-bold'
                  : 'text-emerald-200/70 hover:text-emerald-100 hover:bg-emerald-900/30'
              }`}
            >
              <Leaf className="w-4 h-4 text-emerald-400" />
              {t.planner}
            </button>

            <button
              onClick={() => setActiveTab('refining')}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'refining'
                  ? 'bg-emerald-700/30 text-emerald-300 border border-emerald-500/60 shadow-lg shadow-emerald-950/50 font-bold'
                  : 'text-emerald-200/70 hover:text-emerald-100 hover:bg-emerald-900/30'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              {t.refining}
            </button>

            <button
              onClick={() => setActiveTab('scanner')}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'scanner'
                  ? 'bg-emerald-700/30 text-emerald-300 border border-emerald-500/60 shadow-lg shadow-emerald-950/50 font-bold'
                  : 'text-emerald-200/70 hover:text-emerald-100 hover:bg-emerald-900/30'
              }`}
            >
              <Compass className="w-4 h-4 text-teal-400" />
              {t.scanner}
            </button>

            <button
              onClick={() => setActiveTab('captured')}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'captured'
                  ? 'bg-emerald-700/30 text-emerald-300 border border-emerald-500/60 shadow-lg shadow-emerald-950/50 font-bold'
                  : 'text-emerald-200/70 hover:text-emerald-100 hover:bg-emerald-900/30'
              }`}
            >
              <Radio className={`w-4 h-4 ${snifferStatus === 'connected' ? 'text-emerald-400' : 'text-emerald-600'}`} />
              <span>{t.captured}</span>
              {capturedCount > 0 && (
                <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/40">
                  {capturedCount}
                </span>
              )}
            </button>
          </nav>

          {/* Right side controls: Sniffer, Server, Premium, Language, Settings */}
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            
            {/* Live Packet Sniffer Indicator */}
            <div
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                snifferStatus === 'connected'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-950'
                  : 'bg-[#0e2419] text-emerald-500/60 border-[#1a402d]'
              }`}
              title={
                snifferStatus === 'connected'
                  ? 'Duch Puszczy czuwa! Pakiety rynku przechwytywane w locie.'
                  : 'Duch Puszczy uśpiony. Sniffer offline.'
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  snifferStatus === 'connected' ? 'bg-emerald-400 animate-ping' : 'bg-emerald-800'
                }`}
              />
              <span className="hidden sm:inline">
                {snifferStatus === 'connected' ? '🌲 Sniffer LIVE' : '🍂 Sniffer OFF'}
              </span>
            </div>
            {/* Server Region Selector */}
            <div className="flex items-center bg-[#0d2217] border border-[#1b442f] rounded-xl p-0.5">
              {(['europe', 'west', 'east'] as ServerRegion[]).map((reg) => (
                <button
                  key={reg}
                  onClick={() => setServer(reg)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg uppercase transition-all ${
                    server === reg
                      ? 'bg-emerald-500 text-black shadow font-bold'
                      : 'text-emerald-300/70 hover:text-emerald-200'
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
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                hasPremium
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-950/40'
                  : 'bg-[#0d2217] text-emerald-400/60 border-[#1b442f] hover:text-emerald-300'
              }`}
              title={t.premium}
            >
              <Shield className={`w-3.5 h-3.5 ${hasPremium ? 'text-amber-400' : 'text-emerald-600'}`} />
              <span className="hidden sm:inline">Łaska Lasu:</span> {hasPremium ? '4%' : '8%'}
            </button>

            {/* Language toggle */}
            <button
              onClick={() => setLanguage(language === 'pl' ? 'en' : 'pl')}
              className="px-2 py-1.5 rounded-xl bg-[#0d2217] border border-[#1b442f] text-xs font-semibold text-emerald-300 hover:text-emerald-100 hover:border-emerald-500/50 transition-colors flex items-center gap-1"
              title="Zmień język / Switch Language"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{language.toUpperCase()}</span>
            </button>

            {/* Settings button */}
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-xl bg-[#0d2217] border border-[#1b442f] text-emerald-400 hover:text-emerald-200 hover:border-emerald-500/50 transition-colors"
              title={t.settings}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Mobile Tab Bar */}
        <div className="flex md:hidden border-t border-[#1b442f] py-2 space-x-1">
          <button
            onClick={() => setActiveTab('planner')}
            className={`flex-1 py-1.5 text-xs text-center rounded-lg font-medium ${
              activeTab === 'planner' ? 'bg-emerald-600/25 text-emerald-300 font-bold border border-emerald-500/40' : 'text-emerald-300/60'
            }`}
          >
            {t.planner}
          </button>
          <button
            onClick={() => setActiveTab('refining')}
            className={`flex-1 py-1.5 text-xs text-center rounded-lg font-medium ${
              activeTab === 'refining' ? 'bg-emerald-600/25 text-emerald-300 font-bold border border-emerald-500/40' : 'text-emerald-300/60'
            }`}
          >
            {t.refining}
          </button>
          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex-1 py-1.5 text-xs text-center rounded-lg font-medium ${
              activeTab === 'scanner' ? 'bg-emerald-600/25 text-emerald-300 font-bold border border-emerald-500/40' : 'text-emerald-300/60'
            }`}
          >
            {t.scanner}
          </button>
          <button
            onClick={() => setActiveTab('captured')}
            className={`flex-1 py-1.5 text-xs text-center rounded-lg font-medium ${
              activeTab === 'captured' ? 'bg-emerald-600/25 text-emerald-300 font-bold border border-emerald-500/40' : 'text-emerald-300/60'
            }`}
          >
            {t.captured} {capturedCount > 0 ? `(${capturedCount})` : ''}
          </button>
        </div>
      </div>
    </header>
  );
};
