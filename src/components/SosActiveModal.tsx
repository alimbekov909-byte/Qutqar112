import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  PhoneCall,
  X,
  Volume2,
  VolumeX,
  Share2,
  Copy,
  Check,
  Bot,
  MapPin,
  Radio,
} from 'lucide-react';
import { Coordinates, IncidentCategory, MedicalProfile, AppLanguage } from '../types/emergency';
import { audioSynthesizer } from '../utils/audioSynthesizer';
import { buildEmergencyWhatsAppMessage, openWhatsAppChat } from '../utils/whatsappHelper';

interface SosActiveModalProps {
  category: IncidentCategory;
  coords: Coordinates;
  address: string;
  medicalProfile: MedicalProfile;
  language: AppLanguage;
  onClose: () => void;
  onOpenAi: (category: IncidentCategory) => void;
}

export const SosActiveModal: React.FC<SosActiveModalProps> = ({
  category,
  coords,
  address,
  medicalProfile,
  language,
  onClose,
  onOpenAi,
}) => {
  const [countdown, setCountdown] = useState<number>(5);
  const [isAborted, setIsAborted] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [copied, setCopied] = useState(false);

  const isKz = language === 'kz';

  // 5-second safety abort countdown
  useEffect(() => {
    if (countdown > 0 && !isAborted && !isLive) {
      audioSynthesizer.playCprClick(true);
      const timer = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !isAborted) {
      setIsLive(true);
      audioSynthesizer.startSiren();
    }
  }, [countdown, isAborted, isLive]);

  const handleCancel = () => {
    setIsAborted(true);
    audioSynthesizer.stopSiren();
    onClose();
  };

  const skipCountdown = () => {
    setCountdown(0);
    setIsLive(true);
    audioSynthesizer.startSiren();
  };

  const getSmsText = () => {
    const lat = coords.latitude.toFixed(6);
    const lng = coords.longitude.toFixed(6);
    return `[SOS 112 QUTQAR] ТРЕБУЕТСЯ ПОМОЩЬ!
Тип: ${category.toUpperCase()}
Координаты: ${lat}, ${lng}
Карта: https://maps.google.com/?q=${lat},${lng}
Адрес: ${address}
Пострадавший: ${medicalProfile.fullName || 'Аноним'} (${medicalProfile.bloodGroup})
Контакт: ${medicalProfile.iceContacts[0]?.phone || 'Н/Д'}`;
  };

  const copySms = () => {
    navigator.clipboard.writeText(getSmsText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
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
      incidentType: category.toUpperCase(),
      language,
    });

    if (primaryContact?.phone) {
      openWhatsAppChat(primaryContact.phone, message);
    } else {
      openWhatsAppChat('', message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-5 overflow-y-auto">
      {/* Top Bar with Cancel */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2 text-red-500 font-extrabold text-sm tracking-wider uppercase">
          <Radio className="w-5 h-5 animate-pulse" />
          <span>{isKz ? 'SOS СИГНАЛЫ ІСКЕ ҚОСЫЛДЫ' : 'SOS СИГНАЛ ТРЕВОГИ 112'}</span>
        </div>
        <button
          onClick={handleCancel}
          className="px-3 py-1.5 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white font-bold text-xs flex items-center gap-1"
        >
          <X className="w-4 h-4" />
          <span>{isKz ? 'Болдырмау' : 'Отмена'}</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="my-auto py-4 space-y-5 text-center">
        {!isLive ? (
          /* Countdown Phase */
          <div className="space-y-4">
            <div className="w-32 h-32 mx-auto rounded-full border-4 border-red-500 bg-red-950/40 flex items-center justify-center animate-ping">
              <span className="font-mono text-5xl font-black text-white">{countdown}</span>
            </div>
            <div>
              <h2 className="text-xl font-black text-white">
                {isKz ? 'Дабыл жіберілуде...' : 'Отправка экстренного SOS...'}
              </h2>
              <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
                {isKz
                  ? 'Жалған басылса, «Болдырмау» батырмасын басыңыз'
                  : 'Если нажали случайно, нажмите «Отмена» для сброса'}
              </p>
            </div>
            <button
              onClick={skipCountdown}
              className="py-2.5 px-6 rounded-xl bg-red-600 text-white font-bold text-xs shadow-lg"
            >
              {isKz ? 'Күтпей дереу шақыру' : 'Вызвать немедленно'}
            </button>
          </div>
        ) : (
          /* Live SOS Active Phase */
          <div className="space-y-4 text-left">
            <div className="p-4 rounded-2xl bg-red-950/60 border border-red-500/50 text-center space-y-2">
              <div className="inline-flex p-3 rounded-full bg-red-600/30 text-red-400">
                <AlertOctagon className="w-8 h-8 animate-pulse" />
              </div>
              <h2 className="text-lg font-black text-white">
                {isKz ? '112-ге қоңырау шалыңыз' : 'Свяжитесь с диспетчером 112'}
              </h2>
              <p className="text-xs text-neutral-300 max-w-sm mx-auto">
                {isKz
                  ? 'Координаттарыңыз бен медициналық деректер дайын. Қоңырауды басыңыз!'
                  : 'Ваши координаты и данные подготовлены. Нажмите кнопку вызова ниже.'}
              </p>
            </div>

            {/* Direct 112 & 103 Call buttons */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href="tel:112"
                className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-red-950/50 active:scale-95 transition-transform"
              >
                <PhoneCall className="w-5 h-5" />
                <span>112 (Единая служба)</span>
              </a>

              <a
                href="tel:103"
                className="py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-sm flex items-center justify-center gap-2 border border-neutral-700 active:scale-95 transition-transform"
              >
                <PhoneCall className="w-4 h-4 text-red-400" />
                <span>103 (Скорая)</span>
              </a>
            </div>

            {/* AI Assistant Handoff */}
            <button
              onClick={() => {
                onClose();
                onOpenAi(category);
              }}
              className="w-full py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2"
            >
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>
                {isKz
                  ? 'Көмек келгенше ИИ-нұсқаулықты бастау'
                  : 'Пока ждете службы: открыть ИИ-инструктора'}
              </span>
            </button>

            {/* SOS SMS text and copy */}
            <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between text-neutral-400">
                <span>Текст SOS-сообщения:</span>
                <button onClick={copySms} className="text-cyan-400 font-mono flex items-center gap-1">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Скопировано' : 'Копировать'}</span>
                </button>
              </div>
              <pre className="font-mono text-[11px] text-neutral-300 whitespace-pre-wrap bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                {getSmsText()}
              </pre>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={shareWhatsApp}
                  className="flex-1 py-2 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp родным</span>
                </button>

                <button
                  onClick={() => audioSynthesizer.stopSiren()}
                  className="py-2 px-3 rounded-lg bg-neutral-800 text-neutral-300 border border-neutral-700 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Заглушить сирену</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleCancel}
        className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs"
      >
        {isKz ? 'Жабу' : 'Закрыть окно тревоги'}
      </button>
    </div>
  );
};
