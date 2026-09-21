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
    <header className="bg-[#091b12]/95 border-b border-[#1b442f] sticky top-0 z-30 shadow-xl shadow-black/50 backdrop-blur-md">
      <div className="max-w-[1550px] mx-auto px-3 sm:px-5 lg:px-8">
        <div className="flex items-center justify-between min-h-[4rem] py-2 gap-2 lg:gap-4">
          
          {/* Druidic Brand Logo */}
          <div className="flex items-center space-x-2.5 cursor-pointer group flex-shrink-0" onClick={() => setActiveTab('planner')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 via-emerald-800 to-teal-950 flex items-center justify-center shadow-lg shadow-emerald-950/60 border border-emerald-400/50 group-hover:border-emerald-300 transition-all flex-shrink-0">
              <Trees className="w-5 h-5 text-emerald-200 drop-shadow group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex flex-col justify-center">
              <div className="text-xs sm:text-sm lg:text-base font-bold font-albion tracking-wide text-emerald-300 drop-shadow flex items-center gap-1.5 group-hover:text-emerald-200 transition-colors whitespace-nowrap">
                <span>{t.title}</span>
                <span className="text-[9px] font-sans font-semibold uppercase px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hidden 2xl:inline-block">
                  DRUID
                </span>
              </div>
              <div className="text-[10px] text-emerald-400/70 font-medium hidden 2xl:block leading-tight">{t.subtitle}</div>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5 flex-shrink-0">
            <button
              onClick={() => setActiveTab('planner')}
              className={`px-2.5 lg:px-3.5 py-1.5 rounded-xl text-xs lg:text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'planner'
                  ? 'bg-emerald-700/30 text-emerald-300 border border-emerald-500/60 shadow-lg shadow-emerald-950/50 font-bold'
                  : 'text-emerald-200/70 hover:text-emerald-100 hover:bg-emerald-900/30'
              }`}
            >
              <Leaf className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-emerald-400" />
              <span>{t.planner}</span>
            </button>

            <button
              onClick={() => setActiveTab('refining')}
              className={`px-2.5 lg:px-3.5 py-1.5 rounded-xl text-xs lg:text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'refining'
                  ? 'bg-emerald-700/30 text-emerald-300 border border-emerald-500/60 shadow-lg shadow-emerald-950/50 font-bold'
                  : 'text-emerald-200/70 hover:text-emerald-100 hover:bg-emerald-900/30'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-amber-400" />
              <span>{t.refining}</span>
            </button>

            <button
              onClick={() => setActiveTab('scanner')}
              className={`px-2.5 lg:px-3.5 py-1.5 rounded-xl text-xs lg:text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'scanner'
                  ? 'bg-emerald-700/30 text-emerald-300 border border-emerald-500/60 shadow-lg shadow-emerald-950/50 font-bold'
                  : 'text-emerald-200/70 hover:text-emerald-100 hover:bg-emerald-900/30'
              }`}
            >
              <Compass className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-teal-400" />
              <span>{t.scanner}</span>
            </button>

            <button
              onClick={() => setActiveTab('captured')}
              className={`px-2.5 lg:px-3.5 py-1.5 rounded-xl text-xs lg:text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'captured'
                  ? 'bg-emerald-700/30 text-emerald-300 border border-emerald-500/60 shadow-lg shadow-emerald-950/50 font-bold'
                  : 'text-emerald-200/70 hover:text-emerald-100 hover:bg-emerald-900/30'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 lg:w-4 lg:h-4 ${snifferStatus === 'connected' ? 'text-emerald-400' : 'text-emerald-600'}`} />
              <span>{t.captured}</span>
              {capturedCount > 0 && (
                <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/40">
                  {capturedCount}
                </span>
              )}
            </button>
          </nav>

          {/* Right side controls: Sniffer, Server, Premium, Language, Settings */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
            
            {/* Live Packet Sniffer Indicator */}
            <div
              className={`px-2 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all whitespace-nowrap ${
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
              <span className="hidden xl:inline">
                {snifferStatus === 'connected' ? '🌲 Sniffer LIVE' : '🍂 Sniffer OFF'}
              </span>
              <span className="xl:hidden inline text-[11px]">
                {snifferStatus === 'connected' ? 'LIVE' : 'OFF'}
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
