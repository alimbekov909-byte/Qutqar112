import React, { useState } from 'react';
import {
  ShieldAlert,
  PhoneCall,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Navigation,
  Download,
} from 'lucide-react';
import { Coordinates, AppLanguage } from '../types/emergency';
import { audioSynthesizer } from '../utils/audioSynthesizer';

interface HeaderProps {
  coords: Coordinates;
  address: string;
  language: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  onTriggerSos: () => void;
  onOpenInstall: () => void;
  batteryLevel: number | null;
}

export const Header: React.FC<HeaderProps> = ({
  coords,
  address,
  language,
  onLanguageChange,
  onTriggerSos,
  onOpenInstall,
  batteryLevel,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSirenOn, setIsSirenOn] = useState(false);

  const copyCoordinates = () => {
    const text = `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSiren = () => {
    if (isSirenOn) {
      audioSynthesizer.stopSiren();
      setIsSirenOn(false);
    } else {
      audioSynthesizer.startSiren();
      setIsSirenOn(true);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800 text-neutral-100 px-4 py-2.5">
      {/* Top Bar Contract: 3 zones separated cleanly */}
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        {/* Zone 1: Brand wordmark & Service marker */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white font-bold shadow-md shadow-red-900/30">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-tight text-base text-white">QUTQAR</span>
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold border border-red-500/30">112</span>
            </div>
            <p className="text-[10px] text-neutral-400 font-medium">SOS-сопровождающий</p>
          </div>
        </div>

        {/* Zone 2: GPS Live status indicator */}
        <button
          onClick={copyCoordinates}
          title="Нажмите, чтобы скопировать координаты"
          className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors text-xs text-neutral-300"
        >
          <Navigation className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
          <span className="font-mono tabular-nums text-neutral-200">
            {coords.latitude.toFixed(4)}°, {coords.longitude.toFixed(4)}°
          </span>
          <span className="text-neutral-500 text-[11px]">· {coords.accuracy ? `±${Math.round(coords.accuracy)}м` : 'GPS'}</span>
          {copied ? (
            <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
              <Check className="w-3 h-3" /> Скопировано
            </span>
          ) : (
            <Copy className="w-3 h-3 text-neutral-400 hover:text-white" />
          )}
        </button>

        {/* Zone 3: Quick emergency actions & language switch */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Install App trigger button */}
          <button
            onClick={onOpenInstall}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-200 text-xs font-medium transition-colors"
            title="Установить приложение на телефон"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline font-medium">Установить</span>
          </button>

          {/* Quick Siren toggle */}
          <button
            onClick={toggleSiren}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors border ${
              isSirenOn
                ? 'bg-amber-500 text-neutral-950 border-amber-400 animate-pulse'
                : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
            }`}
            title={isSirenOn ? 'Выключить сирену' : 'Включить аварийную сирену'}
          >
            {isSirenOn ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Direct 112 Call */}
          <a
            href="tel:112"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-sm transition-transform active:scale-95"
            title="Экстренный вызов 112"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span className="font-mono">112</span>
          </a>

          {/* Language selector */}
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 text-xs">
            {(['ru', 'kz', 'en'] as AppLanguage[]).map((lang) => (
              <button
                key={lang}
                onClick={() => onLanguageChange(lang)}
                className={`px-2 py-1 rounded font-medium text-[11px] uppercase transition-colors ${
                  language === lang
                    ? 'bg-neutral-700 text-white font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {lang === 'kz' ? 'ҚАЗ' : lang === 'ru' ? 'РУС' : 'ENG'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile-only compact location strip */}
      <div className="sm:hidden mt-2 pt-2 border-t border-neutral-900 flex items-center justify-between text-[11px] text-neutral-400">
        <div className="flex items-center gap-1.5 truncate max-w-[70%]">
          <Navigation className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="truncate">{address}</span>
        </div>
        <button
          onClick={copyCoordinates}
          className="font-mono text-neutral-300 flex items-center gap-1 shrink-0 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800"
        >
          {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
          {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5 text-neutral-500" />}
        </button>
      </div>
    </header>
  );
};
