import React, { useState, useRef, useEffect } from 'react';
import {
  PhoneCall,
  Flame,
  HeartPulse,
  Car,
  Building2,
  Shield,
  Fuel,
  Share2,
  MessageSquare,
  AlertOctagon,
  Copy,
  Check,
  Bot,
  MapPin,
  Battery,
  UserCheck,
  Radio,
} from 'lucide-react';
import { Coordinates, IncidentCategory, MedicalProfile, AppLanguage } from '../types/emergency';
import { buildEmergencyWhatsAppMessage, openWhatsAppChat } from '../utils/whatsappHelper';
import { WhatsAppDispatchModal } from './WhatsAppDispatchModal';

interface SosTriggerViewProps {
  coords: Coordinates;
  address: string;
  medicalProfile: MedicalProfile;
  language: AppLanguage;
  onOpenAiTriage: (category: IncidentCategory, initialPrompt?: string) => void;
  onActivateEmergency: (category: IncidentCategory) => void;
  batteryLevel: number | null;
}

export const SosTriggerView: React.FC<SosTriggerViewProps> = ({
  coords,
  address,
  medicalProfile,
  language,
  onOpenAiTriage,
  onActivateEmergency,
  batteryLevel,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<IncidentCategory>('medical');
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [copiedDossier, setCopiedDossier] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const holdIntervalRef = useRef<any>(null);

  const isKz = language === 'kz';
  const isEn = language === 'en';

  const categories: {
    id: IncidentCategory;
    icon: React.ComponentType<{ className?: string }>;
    titleRu: string;
    titleKz: string;
    number: string;
    badgeColor: string;
  }[] = [
    {
      id: 'medical',
      icon: HeartPulse,
      titleRu: 'Скорая помощь',
      titleKz: 'Жедел жәрдем',
      number: '103',
      badgeColor: 'border-red-500/40 bg-red-500/10 text-red-400',
    },
    {
      id: 'fire',
      icon: Flame,
      titleRu: 'Пожар / МЧС',
      titleKz: 'Өрт сөндіру',
      number: '101',
      badgeColor: 'border-orange-500/40 bg-orange-500/10 text-orange-400',
    },
    {
      id: 'accident',
      icon: Car,
      titleRu: 'ДТП / Авария',
      titleKz: 'Жол апаты',
      number: '112',
      badgeColor: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
    },
    {
      id: 'earthquake',
      icon: Building2,
      titleRu: 'Землетрясение / Завал',
      titleKz: 'Жер сілкінісі',
      number: '112',
      badgeColor: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
    },
    {
      id: 'threat',
      icon: Shield,
      titleRu: 'Полиция / Угроза',
      titleKz: 'Полиция',
      number: '102',
      badgeColor: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
    },
    {
      id: 'flood',
      icon: Fuel,
      titleRu: 'Газ / Техногенная ЧС',
      titleKz: 'Газ / Төтенше жағдай',
      number: '104',
      badgeColor: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
    },
  ];

  // Press-and-hold activation to eliminate accidental triggers
  const startHold = () => {
    setIsHolding(true);
    setHoldProgress(0);
    const start = Date.now();
    const duration = 1200; // 1.2s hold required

    if ('vibrate' in navigator) {
      navigator.vibrate(40);
    }

    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(100, Math.round((elapsed / duration) * 100));
      setHoldProgress(progress);

      if (progress >= 100) {
        clearInterval(holdIntervalRef.current);
        setIsHolding(false);
        setHoldProgress(0);
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 300]);
        }
        onActivateEmergency(selectedCategory);
      }
    }, 30);
  };

  const endHold = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setIsHolding(false);
    setHoldProgress(0);
  };

  // Immediate click alternative
  const handleDirectClick = () => {
    onActivateEmergency(selectedCategory);
  };

  // Format SOS SMS text
  const generateDossierText = () => {
    const lat = coords.latitude.toFixed(6);
    const lng = coords.longitude.toFixed(6);
    return `[SOS 112 QUTQAR]
Тип ЧС: ${selectedCategory.toUpperCase()}
Координаты: ${lat}, ${lng}
Карта: https://maps.google.com/?q=${lat},${lng}
Адрес: ${address}
Пострадавший: ${medicalProfile.fullName || 'Аноним'}
Группа крови: ${medicalProfile.bloodGroup || 'Не указана'}
Аллергии/Диагнозы: ${medicalProfile.allergies || 'Нет'} / ${medicalProfile.chronicIllness || 'Нет'}
Экстренный контакт: ${medicalProfile.iceContacts[0]?.name || 'Семья'}: ${medicalProfile.iceContacts[0]?.phone || 'Н/Д'}`;
  };

  const copyDossier = () => {
    navigator.clipboard.writeText(generateDossierText());
    setCopiedDossier(true);
    setTimeout(() => setCopiedDossier(false), 2000);
  };

  const shareViaWhatsApp = () => {
    const primaryContact =
      medicalProfile.iceContacts.find((c) => c.isPrimary) ||
      medicalProfile.iceContacts[0];

    const message = buildEmergencyWhatsAppMessage({
      fullName: medicalProfile.fullName,
      bloodGroup: medicalProfile.bloodGroup,
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      address,
      incidentType: selectedCategory.toUpperCase(),
      language,
    });

    if (primaryContact?.phone) {
      // Automatically opens WhatsApp chat directly to the trusted contact's number!
      openWhatsAppChat(primaryContact.phone, message);
    } else {
      openWhatsAppChat('', message);
    }

    // If multiple contacts exist, also open the dispatch modal so user can send to remaining contacts
    if (medicalProfile.iceContacts.length > 1) {
      setIsWhatsAppModalOpen(true);
    }
  };

  return (
    <div className="space-y-5 pb-8">
      {/* 1. Tactical Incident Category Selector */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold text-neutral-400 tracking-wide uppercase">
            {isKz ? 'Төтенше жағдай түрі' : isEn ? 'Select Incident Type' : 'Выберите тип чрезвычайной ситуации'}
          </span>
          <span className="text-[11px] text-neutral-500">
            {isKz ? '112 пультіне жіберіледі' : 'Передается оператору 112'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[74px] active:scale-95 ${
                  isSelected
                    ? 'bg-neutral-800 border-red-500/80 text-white shadow-md shadow-red-950/40 ring-1 ring-red-500'
                    : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-red-400' : 'text-neutral-400'}`} />
                  <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-neutral-950/60 font-semibold text-neutral-400">
                    {cat.number}
                  </span>
                </div>
                <div className="mt-1 font-semibold text-xs leading-tight">
                  {isKz ? cat.titleKz : cat.titleRu}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Hero SOS Button: High-Voltage Emergency Trigger */}
      <div className="relative flex flex-col items-center justify-center pt-2 pb-4">
        {/* Radar Ring Pulses */}
        <div className="absolute w-64 h-64 rounded-full border border-red-500/20 animate-ping pointer-events-none" />
        <div className="absolute w-56 h-56 rounded-full border border-red-500/30 animate-pulse pointer-events-none" />

        {/* Circular Progress border during hold */}
        <div className="relative">
          <svg className="w-48 h-48 -rotate-90 transform pointer-events-none">
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="#262626"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="#ef4444"
              strokeWidth="7"
              strokeDasharray="552.9"
              strokeDashoffset={552.9 - (552.9 * holdProgress) / 100}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-75"
            />
          </svg>

          {/* The SOS Button */}
          <button
            onMouseDown={startHold}
            onMouseUp={endHold}
            onMouseLeave={endHold}
            onTouchStart={startHold}
            onTouchEnd={endHold}
            onClick={handleDirectClick}
            className="absolute inset-3 rounded-full bg-gradient-to-br from-red-600 via-red-600 to-red-800 text-white flex flex-col items-center justify-center shadow-2xl shadow-red-600/50 active:scale-95 transition-transform select-none focus:outline-none focus:ring-4 focus:ring-red-500/40"
          >
            <div className="flex items-center gap-1.5 text-red-200 text-xs font-bold tracking-wider uppercase">
              <Radio className="w-3.5 h-3.5 animate-pulse text-red-300" />
              <span>112 SOS</span>
            </div>
            <span className="text-4xl font-black tracking-tighter mt-0.5">SOS</span>
            <span className="text-[11px] text-red-100 font-medium mt-1">
              {isHolding
                ? `${holdProgress}%`
                : isKz
                ? 'Басыңыз немесе ұстаңыз'
                : 'Нажмите для вызова'}
            </span>
          </button>
        </div>

        {/* Subtext info */}
        <p className="text-xs text-neutral-400 mt-3 text-center max-w-xs">
          {isKz
            ? 'Шұғыл шақыру карточкасы мен координаттар 112 диспетчеріне бірден дайындалады'
            : 'Мгновенно формирует досье с координатами и медкартой для оператора 112'}
        </p>
      </div>

      {/* 3. Fast Response Action Bar */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Direct Call 112 */}
        <a
          href="tel:112"
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-md shadow-red-900/30 transition-all active:scale-[0.98]"
        >
          <PhoneCall className="w-4 h-4" />
          <span>{isKz ? '112-ге қоңырау' : 'Звонок 112'}</span>
        </a>

        {/* AI Emergency Triage Companion */}
        <button
          onClick={() => onOpenAiTriage(selectedCategory)}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 font-semibold text-sm transition-all active:scale-[0.98]"
        >
          <Bot className="w-4 h-4 text-cyan-400" />
          <span>{isKz ? 'ИИ-Көмекші' : 'ИИ-Сопровождение'}</span>
        </button>
      </div>

      {/* 4. Live Digital 112 Dossier & Coordinates Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold text-xs text-neutral-200">
              {isKz ? 'Қазіргі геопозиция және деректер' : 'Текущая геопозиция для оператора'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
            {batteryLevel !== null && (
              <span className="flex items-center gap-1 text-[11px] text-neutral-400">
                <Battery className="w-3.5 h-3.5 text-neutral-300" /> {batteryLevel}%
              </span>
            )}
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex items-start justify-between gap-2">
            <span className="text-neutral-500 shrink-0">{isKz ? 'Мекенжай:' : 'Адрес:'}</span>
            <span className="font-medium text-neutral-200 text-right truncate">{address}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">{isKz ? 'Координаттар:' : 'Координаты:'}</span>
            <span className="font-mono tabular-nums text-neutral-300">
              {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">{isKz ? 'Дәлдік / Биіктік:' : 'Точность / Высота:'}</span>
            <span className="font-mono text-neutral-400">
              {coords.accuracy ? `±${Math.round(coords.accuracy)} м` : '±6 м'} · {coords.altitude ? `${Math.round(coords.altitude)} м` : '810 м над ур. моря'}
            </span>
          </div>
        </div>

        {/* Quick Send & Share Actions */}
        <div className="pt-2 border-t border-neutral-800/80 flex items-center gap-2">
          <button
            onClick={copyDossier}
            className="flex-1 py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 font-medium flex items-center justify-center gap-1.5 transition-colors border border-neutral-700/60"
          >
            {copiedDossier ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isKz ? 'Көшірілді' : 'Скопировано'}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-neutral-400" />
                <span>{isKz ? 'SMS мәтінін көшіру' : 'Копировать SOS-SMS'}</span>
              </>
            )}
          </button>

          <button
            onClick={shareViaWhatsApp}
            className="py-2 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border border-emerald-500/30"
            title="Отправить в WhatsApp родным"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp ICE</span>
          </button>
        </div>
      </div>

      {/* 5. Medical ID & Bystander Summary Card */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-neutral-200">
              {medicalProfile.fullName || 'Пациент'} · <span className="font-mono text-red-400">{medicalProfile.bloodGroup}</span>
            </div>
            <div className="text-[11px] text-neutral-400 truncate max-w-[240px]">
              Аллергия: {medicalProfile.allergies || 'нет'} · Астма/Хронич: {medicalProfile.chronicIllness || 'нет'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={shareViaWhatsApp}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-mono flex items-center gap-1"
            title="Отправить SOS геолокацию в WhatsApp доверенному"
          >
            <MessageSquare className="w-3 h-3" />
            <span>WhatsApp</span>
          </button>

          <a
            href={`tel:${medicalProfile.iceContacts[0]?.phone}`}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 text-xs font-mono flex items-center gap-1"
            title="Позвонить экстренному контакту"
          >
            <PhoneCall className="w-3 h-3 text-emerald-400" />
            <span>ICE</span>
          </a>
        </div>
      </div>

      {/* WhatsApp Dispatch Modal */}
      <WhatsAppDispatchModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        coords={coords}
        address={address}
        medicalProfile={medicalProfile}
        incidentType={selectedCategory.toUpperCase()}
        language={language}
      />
    </div>
  );
};
