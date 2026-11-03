import React, { useState } from 'react';
import {
  Smartphone,
  Share,
  PlusSquare,
  Check,
  Copy,
  ExternalLink,
  X,
  Download,
  QrCode,
  ShieldAlert,
  WifiOff,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AppLanguage } from '../types/emergency';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: AppLanguage;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [copiedLink, setCopiedLink] = useState(false);
  const [activePlatform, setActivePlatform] = useState<'ios' | 'android'>('android');

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-esslegbj2t6rgwsdmhytq7-472534272646.asia-southeast1.run.app';
  const appUrl = currentOrigin;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    appUrl
  )}&bgcolor=171717&color=ffffff&margin=10`;

  const isKz = language === 'kz';

  const copyUrl = () => {
    navigator.clipboard.writeText(appUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 text-neutral-100 space-y-5 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Lockup */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-900/40 text-white shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-white">
              {isKz ? '«Qutqar 112» телефонға орнату' : 'Установка «Qutqar 112» на телефон'}
            </h3>
            <p className="text-xs text-neutral-400">
              {isKz ? 'Интернетсіз жұмыс істейтін PWA қосымшасы' : 'Нативное PWA приложение с офлайн-доступом'}
            </p>
          </div>
        </div>

        {/* 1-Tap Install Button if Browser Supports it */}
        {isInstallable && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/60 to-neutral-950 border border-red-500/40 space-y-2.5">
            <div className="text-xs font-bold text-red-300 uppercase tracking-wide flex items-center gap-1.5">
              <Download className="w-4 h-4 text-red-400" />
              <span>{isKz ? 'Тікелей орнату қолжетімді' : 'Быстрая установка в 1 клик'}</span>
            </div>
            <p className="text-xs text-neutral-300">
              {isKz
                ? 'Қосымшаны негізгі экранға белгіше ретінде қосу үшін басыңыз:'
                : 'Нажмите кнопку ниже, чтобы добавить приложение на домашний экран смартфона:'}
            </p>
            <button
              onClick={handleInstallClick}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-xl shadow-red-950/40 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Download className="w-4 h-4" />
              <span>{isKz ? 'Қосымшаны орнату' : 'Установить Qutqar 112'}</span>
            </button>
          </div>
        )}

        {/* Platform Tabs: Android / iPhone */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 p-1 bg-neutral-950 border border-neutral-800 rounded-xl">
            <button
              onClick={() => setActivePlatform('android')}
              className={`py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                activePlatform === 'android'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android (Chrome)</span>
            </button>
            <button
              onClick={() => setActivePlatform('ios')}
              className={`py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                activePlatform === 'ios'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Share className="w-3.5 h-3.5" />
              <span>iPhone (Safari)</span>
            </button>
          </div>

          {/* Android Steps */}
          {activePlatform === 'android' && (
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs space-y-2.5">
              <span className="font-bold text-neutral-200 block">
                {isKz ? 'Android құрылғыларына орнату қадамдары:' : 'Как установить на Android:'}
              </span>
              <ol className="space-y-2 text-neutral-300">
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-red-400">1.</span>
                  <span>
                    Откройте ссылку приложения в браузере <strong>Google Chrome</strong> на телефоне.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-red-400">2.</span>
                  <span>
                    Нажмите меню с тремя точками <strong>(⋮)</strong> в верхнем правом углу экрана.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-red-400">3.</span>
                  <span>
                    Выберите пункт <strong>«Установить приложение»</strong> или <strong>«Добавить на главный экран»</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-red-400">4.</span>
                  <span>
                    Готово! Иконка «Qutqar 112» появится среди приложений и будет открываться на весь экран.
                  </span>
                </li>
              </ol>
            </div>
          )}

          {/* iOS Safari Steps */}
          {activePlatform === 'ios' && (
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs space-y-2.5">
              <span className="font-bold text-neutral-200 block">
                {isKz ? 'iPhone / iPad құрылғысына орнату қадамдары:' : 'Как установить на iPhone / iPad:'}
              </span>
              <ol className="space-y-2 text-neutral-300">
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-cyan-400">1.</span>
                  <span>
                    Откройте ссылку именно в стандартном браузере <strong>Safari</strong> (Apple поддерживает PWA только через Safari).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-cyan-400">2.</span>
                  <span>
                    В нижней панели Safari нажмите кнопку <strong>«Поделиться»</strong> (квадрат со стрелкой вверх <Share className="w-3.5 h-3.5 inline mx-0.5 text-cyan-400" />).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-cyan-400">3.</span>
                  <span>
                    Прокрутите вниз список и выберите пункт <strong>«На экран "Домой"» (Add to Home Screen)</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-neutral-300" />.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-cyan-400">4.</span>
                  <span>
                    В правом верхнем углу нажмите <strong>«Добавить»</strong>. Приложение появится на рабочем столе iPhone!
                  </span>
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* QR Code and Direct URL for Scanning from Computer */}
        <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-amber-400" />
              <span>{isKz ? 'Телефон камерасымен сканерлеу' : 'Сканировать камерой телефона'}</span>
            </span>
            <button
              onClick={copyUrl}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedLink ? 'Скопировано' : 'Скопировать ссылку'}</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-24 h-24 rounded-xl bg-neutral-900 border border-neutral-800 p-1 flex items-center justify-center shrink-0">
              <img
                src={qrCodeUrl}
                alt="QR Code"
                className="w-full h-full rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="text-[11px] text-neutral-400 space-y-1">
              <p className="leading-snug">
                Наведите камеру смартфона на QR-код для мгновенного перехода в браузере.
              </p>
              <p className="font-mono text-[10px] text-neutral-300 truncate max-w-[210px]">
                {appUrl}
              </p>
            </div>
          </div>
        </div>

        {/* Offline & Standalone Feature Highlight */}
        <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 flex items-start gap-2.5 text-xs text-neutral-400">
          <WifiOff className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong>Работает без интернета:</strong> После добавления на домашний экран протоколы первой помощи, СЛР-метроном, сирена, медкарта и база укрытий кэшируются на устройстве и работают в режиме оффлайн.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs"
        >
          {isKz ? 'Түсінікті, жабу' : 'Понятно, закрыть'}
        </button>
      </div>
    </div>
  );
};
