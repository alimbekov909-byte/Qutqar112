import React, { useState, useEffect, useRef } from 'react';
import {
  HeartPulse,
  Volume2,
  VolumeX,
  Flashlight,
  Compass,
  Mic,
  Square,
  Play,
  RotateCcw,
  MapPin,
  Building,
  Navigation,
  Shield,
  Zap,
} from 'lucide-react';
import { Coordinates, SafeShelterPoint, AppLanguage } from '../types/emergency';
import { audioSynthesizer } from '../utils/audioSynthesizer';
import { SAFE_SHELTER_POINTS } from '../utils/offlineData';
import { calculateDistanceMeters, calculateBearingDegrees } from '../hooks/useGeolocation';

interface RescueToolsViewProps {
  coords: Coordinates;
  language: AppLanguage;
  initialTool?: 'cpr' | 'siren' | 'strobe' | 'radar';
}

export const RescueToolsView: React.FC<RescueToolsViewProps> = ({
  coords,
  language,
  initialTool = 'cpr',
}) => {
  const [activeTab, setActiveTab] = useState<'cpr' | 'siren' | 'strobe' | 'radar'>(initialTool);
  const isKz = language === 'kz';

  // 1. CPR Metronome State
  const [cprRunning, setCprRunning] = useState(false);
  const [cprCount, setCprCount] = useState(0);
  const [cprCycle, setCprCycle] = useState(1);
  const [cprSeconds, setCprSeconds] = useState(0);
  const [cprPhase, setCprPhase] = useState<'compress' | 'breathe'>('compress');
  const cprIntervalRef = useRef<any>(null);
  const cprTimerRef = useRef<any>(null);

  // 2. Siren State
  const [sirenActive, setSirenActive] = useState(false);

  // 3. Strobe State
  const [strobeActive, setStrobeActive] = useState(false);
  const [strobeColor, setStrobeColor] = useState(false);
  const strobeIntervalRef = useRef<any>(null);
  const [torchTrack, setTorchTrack] = useState<MediaStreamTrack | null>(null);

  // 4. Radar filter
  const [radarFilter, setRadarFilter] = useState<'all' | 'shelter' | 'hospital' | 'aed'>('all');

  // CPR Logic (110 BPM -> ~545ms per compression)
  useEffect(() => {
    if (cprRunning) {
      // 110 BPM interval
      const beatInterval = (60 / 110) * 1000;
      cprIntervalRef.current = setInterval(() => {
        setCprCount((prev) => {
          const next = prev + 1;
          if (next <= 30) {
            audioSynthesizer.playCprClick(next === 1 || next === 30);
            setCprPhase('compress');
            return next;
          } else {
            // Breathe phase (2 breaths for ~4 seconds)
            setCprPhase('breathe');
            setCprCycle((c) => c + 1);
            return 0;
          }
        });
      }, beatInterval);

      // Resuscitation timer
      cprTimerRef.current = setInterval(() => {
        setCprSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (cprIntervalRef.current) clearInterval(cprIntervalRef.current);
      if (cprTimerRef.current) clearInterval(cprTimerRef.current);
    }

    return () => {
      if (cprIntervalRef.current) clearInterval(cprIntervalRef.current);
      if (cprTimerRef.current) clearInterval(cprTimerRef.current);
    };
  }, [cprRunning]);

  const toggleCpr = () => {
    setCprRunning(!cprRunning);
  };

  const resetCpr = () => {
    setCprRunning(false);
    setCprCount(0);
    setCprCycle(1);
    setCprSeconds(0);
    setCprPhase('compress');
  };

  // Siren toggle
  const toggleSiren = () => {
    if (sirenActive) {
      audioSynthesizer.stopSiren();
      setSirenActive(false);
    } else {
      audioSynthesizer.startSiren();
      setSirenActive(true);
    }
  };

  // Strobe toggle & Torch API
  const toggleStrobe = async () => {
    if (strobeActive) {
      clearInterval(strobeIntervalRef.current);
      setStrobeActive(false);
      setStrobeColor(false);
      if (torchTrack) {
        try {
          await (torchTrack as any).applyConstraints({ advanced: [{ torch: false }] });
          torchTrack.stop();
          setTorchTrack(null);
        } catch (e) {}
      }
    } else {
      setStrobeActive(true);
      // Try hardware camera torch if supported
      if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
          });
          const track = stream.getVideoTracks()[0];
          const capabilities = (track as any).getCapabilities?.() || {};
          if (capabilities.torch) {
            await (track as any).applyConstraints({ advanced: [{ torch: true }] });
            setTorchTrack(track);
          }
        } catch (err) {
          // Hardware torch unavailable; fallback to full screen strobe
        }
      }

      // Flash screen at 8Hz
      strobeIntervalRef.current = setInterval(() => {
        setStrobeColor((c) => !c);
      }, 125);
    }
  };

  // Clean up audio and strobe on unmount
  useEffect(() => {
    return () => {
      audioSynthesizer.stopSiren();
      if (strobeIntervalRef.current) clearInterval(strobeIntervalRef.current);
    };
  }, []);

  // Format seconds into mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Calculate safe points with real distance & bearing
  const pointsWithDistance = SAFE_SHELTER_POINTS.map((pt) => {
    const dist = calculateDistanceMeters(
      coords.latitude,
      coords.longitude,
      pt.latitude,
      pt.longitude
    );
    const bearing = calculateBearingDegrees(
      coords.latitude,
      coords.longitude,
      pt.latitude,
      pt.longitude
    );
    return { ...pt, distanceMeters: dist, bearing };
  }).sort((a, b) => a.distanceMeters - b.distanceMeters);

  const filteredPoints = pointsWithDistance.filter((pt) => {
    if (radarFilter === 'all') return true;
    return pt.type === radarFilter;
  });

  return (
    <div className="space-y-4 pb-8">
      {/* Fullscreen Strobe Overlay if active */}
      {strobeActive && (
        <div
          onClick={toggleStrobe}
          className={`fixed inset-0 z-50 flex flex-col items-center justify-between p-8 select-none transition-colors ${
            strobeColor ? 'bg-white text-neutral-950' : 'bg-neutral-950 text-white'
          }`}
        >
          <div className="font-mono text-sm tracking-widest font-bold">
            SOS STROBE BEACON
          </div>
          <div className="text-center">
            <span className="text-6xl font-black">SOS</span>
            <p className="text-sm font-semibold mt-2">
              {isKz ? 'Тоқтату үшін экранды басыңыз' : 'Нажмите на экран для выключения'}
            </p>
          </div>
          <button
            onClick={toggleStrobe}
            className="px-6 py-3 rounded-full bg-red-600 text-white font-bold text-sm shadow-xl"
          >
            {isKz ? 'Өшіру' : 'Выключить стробоскоп'}
          </button>
        </div>
      )}

      {/* Segmented Tool Switcher */}
      <div className="grid grid-cols-4 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
        <button
          onClick={() => setActiveTab('cpr')}
          className={`py-2 px-1 text-center text-xs font-semibold rounded-lg transition-colors flex flex-col items-center gap-1 ${
            activeTab === 'cpr'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <HeartPulse className="w-4 h-4 text-red-400" />
          <span>{isKz ? 'СЛР-Метроном' : 'СЛР (CPR)'}</span>
        </button>

        <button
          onClick={() => setActiveTab('siren')}
          className={`py-2 px-1 text-center text-xs font-semibold rounded-lg transition-colors flex flex-col items-center gap-1 ${
            activeTab === 'siren'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Volume2 className="w-4 h-4 text-amber-400" />
          <span>{isKz ? 'Сирена' : 'Сирена'}</span>
        </button>

        <button
          onClick={() => setActiveTab('strobe')}
          className={`py-2 px-1 text-center text-xs font-semibold rounded-lg transition-colors flex flex-col items-center gap-1 ${
            activeTab === 'strobe'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Flashlight className="w-4 h-4 text-cyan-400" />
          <span>{isKz ? 'SOS-Жарық' : 'Стробоскоп'}</span>
        </button>

        <button
          onClick={() => setActiveTab('radar')}
          className={`py-2 px-1 text-center text-xs font-semibold rounded-lg transition-colors flex flex-col items-center gap-1 ${
            activeTab === 'radar'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Compass className="w-4 h-4 text-emerald-400" />
          <span>{isKz ? 'Укрытия' : 'Радар СЭП'}</span>
        </button>
      </div>

      {/* 1. CPR METRONOME TOOL */}
      {activeTab === 'cpr' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4 text-red-500" />
                <span>{isKz ? 'Сердечно-өкпе реанимациясы' : 'СЛР-Метроном (110 уд/мин)'}</span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                {isKz ? '30 рет кеудеге басу / 2 рет дем үрлеу' : 'Алгоритм ERC/AHA: 30 компрессий / 2 вдоха'}
              </p>
            </div>
            <div className="font-mono tabular-nums text-xs font-bold px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300">
              {formatTime(cprSeconds)}
            </div>
          </div>

          {/* Central Beat Display */}
          <div className="py-6 flex flex-col items-center justify-center">
            <div
              className={`w-40 h-40 rounded-full flex flex-col items-center justify-center border-4 transition-all duration-100 ${
                cprRunning && cprCount > 0
                  ? 'border-red-500 bg-red-950/40 shadow-xl shadow-red-900/30 scale-105'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-400'
              }`}
            >
              {cprPhase === 'compress' ? (
                <>
                  <span className="font-mono text-5xl font-black text-white tabular-nums">
                    {cprCount > 0 ? cprCount : 0}
                  </span>
                  <span className="text-[11px] text-red-300 font-bold uppercase mt-1">
                    {isKz ? 'Басыңыз (5-6 см)' : 'Давите (5-6 см)'}
                  </span>
                </>
              ) : (
                <>
                  <span className="font-mono text-2xl font-black text-cyan-400">2 ВДОХА</span>
                  <span className="text-[10px] text-cyan-300 font-semibold mt-1">
                    {isKz ? 'Ауа үрлеңіз' : 'Вдувайте воздух'}
                  </span>
                </>
              )}
            </div>

            <div className="mt-3 text-center">
              <span className="text-xs text-neutral-400">
                {isKz ? 'Цикл:' : 'Цикл реанимации:'}{' '}
                <strong className="text-neutral-200">{cprCycle}</strong> (100–120 наж/мин)
              </span>
            </div>
          </div>

          {/* CPR Controls */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={toggleCpr}
              className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md ${
                cprRunning
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/30'
              }`}
            >
              {cprRunning ? (
                <>
                  <Square className="w-4 h-4" />
                  <span>{isKz ? 'Кідірту' : 'Пауза'}</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>{isKz ? 'Бастау (110 соққы)' : 'Старт ритма (110 BPM)'}</span>
                </>
              )}
            </button>

            <button
              onClick={resetCpr}
              className="py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 font-semibold text-sm flex items-center justify-center gap-2 transition-colors active:scale-95"
            >
              <RotateCcw className="w-4 h-4 text-neutral-400" />
              <span>{isKz ? 'Қайта бастау' : 'Сброс'}</span>
            </button>
          </div>

          {/* Quick Resuscitation Reminders */}
          <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-xs text-neutral-400 space-y-1">
            <p>• Центр грудины (между сосками), ладони в замке, локти прямые.</p>
            <p>• Глубина 5–6 см, давайте грудной клетке расправиться.</p>
          </div>
        </div>
      )}

      {/* 2. ACOUSTIC SIREN TOOL */}
      {activeTab === 'siren' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="border-b border-neutral-800 pb-3">
            <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-amber-500" />
              <span>{isKz ? 'Құтқару дабылы (Акустикалық сирена)' : 'Акустическая Сирена Поиска и Спасения'}</span>
            </h3>
            <p className="text-[11px] text-neutral-400">
              {isKz
                ? 'Қирандылар астында немесе тұманда құтқарушы иттер мен жасақтарға белгі беру'
                : 'Специальный звуковой сигнал для кинологов и спасателей под завалами'}
            </p>
          </div>

          <div className="py-8 flex flex-col items-center justify-center">
            <button
              onClick={toggleSiren}
              className={`w-36 h-36 rounded-full flex flex-col items-center justify-center transition-all duration-200 active:scale-95 shadow-2xl ${
                sirenActive
                  ? 'bg-amber-500 text-neutral-950 animate-bounce ring-8 ring-amber-500/20 shadow-amber-500/50'
                  : 'bg-neutral-800 text-amber-400 border border-neutral-700 hover:bg-neutral-750'
              }`}
            >
              {sirenActive ? (
                <>
                  <VolumeX className="w-10 h-10" />
                  <span className="font-bold text-xs uppercase mt-2">
                    {isKz ? 'Өшіру' : 'Выключить'}
                  </span>
                </>
              ) : (
                <>
                  <Volume2 className="w-10 h-10" />
                  <span className="font-bold text-xs uppercase mt-2">
                    {isKz ? 'Қосу' : 'Включить'}
                  </span>
                </>
              )}
            </button>
            <p className="text-xs text-neutral-400 mt-4 text-center max-w-xs">
              {sirenActive
                ? isKz
                  ? 'Дабыл белгісі тоқтаусыз беріліп жатыр'
                  : 'Сирена активна на максимальной мощности динамика'
                : isKz
                ? 'Дыбыс зорайтқышты ең жоғары деңгейге қойыңыз'
                : 'Включите громкость телефона на максимум для лучшей слышимости'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => audioSynthesizer.playMorseSos()}
              className="py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700"
            >
              {isKz ? 'Морзе SOS дыбысы (... --- ...)' : 'Звук Морзе SOS (... --- ...)'}
            </button>
            <a
              href="tel:112"
              className="py-2.5 px-3 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-semibold border border-red-500/30 text-center"
            >
              112 {isKz ? 'Қоңырау' : 'Вызов'}
            </a>
          </div>
        </div>
      )}

      {/* 3. STROBE / FLASHLIGHT TOOL */}
      {activeTab === 'strobe' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="border-b border-neutral-800 pb-3">
            <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-1.5">
              <Flashlight className="w-4 h-4 text-cyan-400" />
              <span>{isKz ? 'SOS-Стробоскоп және жарық маягы' : 'SOS Стробоскоп и Световой Маяк'}</span>
            </h3>
            <p className="text-[11px] text-neutral-400">
              {isKz
                ? 'Түнде немесе түтінде құтқару тікұшағы мен топтарына көріну'
                : 'Подача световых импульсов для спасателей и вертолетов МЧС'}
            </p>
          </div>

          <div className="py-6 flex flex-col items-center justify-center">
            <button
              onClick={toggleStrobe}
              className={`w-36 h-36 rounded-full flex flex-col items-center justify-center transition-all duration-200 active:scale-95 shadow-xl ${
                strobeActive
                  ? 'bg-cyan-400 text-neutral-950 ring-8 ring-cyan-400/20 shadow-cyan-400/50'
                  : 'bg-neutral-800 text-cyan-400 border border-neutral-700 hover:bg-neutral-750'
              }`}
            >
              <Zap className="w-10 h-10" />
              <span className="font-bold text-xs uppercase mt-2">
                {strobeActive
                  ? isKz
                    ? 'Тоқтату'
                    : 'Остановить'
                  : isKz
                  ? 'Стробоскопты қосу'
                  : 'Запустить маяк'}
              </span>
            </button>
            <p className="text-xs text-neutral-400 mt-4 text-center max-w-xs">
              {isKz
                ? 'Экран толық ақ/қара жыпылықтап, артқы камера жарқылы қосылады'
                : 'Разворачивает полноэкранный высококонтрастный стробоскоп и вспышку камеры'}
            </p>
          </div>
        </div>
      )}

      {/* 4. SAFE SHELTER RADAR */}
      {activeTab === 'radar' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
            <div>
              <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-emerald-400" />
                <span>{isKz ? 'Жақын маңдағы қауіпсіз укрытиялар мен СЭП' : 'Ближайшие укрытия и пункты МЧС'}</span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                {isKz
                  ? 'Эвакуациялық ашық алаңдар мен травматология'
                  : 'Расчет расстояния по GPS до пунктов сбора (СЭП)'}
              </p>
            </div>
          </div>

          {/* Radar Filters */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'Все точки' },
              { id: 'shelter', label: 'СЭП (Укрытия)' },
              { id: 'hospital', label: 'Больницы / Травма' },
              { id: 'aed', label: 'Дефибрилляторы (AED)' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setRadarFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                  radarFilter === f.id
                    ? 'bg-neutral-800 text-emerald-400 border border-emerald-500/40'
                    : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-neutral-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* List of Shelters */}
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {filteredPoints.map((pt) => {
              const km =
                pt.distanceMeters > 1000
                  ? `${(pt.distanceMeters / 1000).toFixed(1)} км`
                  : `${pt.distanceMeters} м`;

              return (
                <div
                  key={pt.id}
                  className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          pt.type === 'shelter'
                            ? 'bg-purple-500/20 text-purple-400'
                            : pt.type === 'hospital'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {pt.type === 'shelter'
                          ? 'СЭП МЧС'
                          : pt.type === 'hospital'
                          ? 'Больница'
                          : pt.type === 'aed'
                          ? 'AED ⚡'
                          : 'Пункт'}
                      </span>
                      <h4 className="font-semibold text-xs text-neutral-100 truncate max-w-[190px]">
                        {pt.name}
                      </h4>
                    </div>
                    <p className="text-[11px] text-neutral-400 truncate">{pt.address}</p>
                    {pt.capacity && (
                      <p className="text-[10px] text-neutral-500">
                        Вместимость: {pt.capacity.toLocaleString()} чел.
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs font-bold text-emerald-400">{km}</div>
                    <a
                      href={`https://maps.google.com/?q=${pt.latitude},${pt.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-neutral-400 hover:text-white mt-1 underline"
                    >
                      <Navigation className="w-2.5 h-2.5" />
                      <span>Маршрут</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
