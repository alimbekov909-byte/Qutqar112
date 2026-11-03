import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  X,
  MapPin,
  User,
  Phone,
  Check,
  AlertTriangle,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { Coordinates, MedicalProfile, AppLanguage, IceContact } from '../types/emergency';
import {
  buildEmergencyWhatsAppMessage,
  openWhatsAppChat,
  cleanPhoneNumberForWhatsApp,
} from '../utils/whatsappHelper';

interface WhatsAppDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  coords: Coordinates;
  address: string;
  medicalProfile: MedicalProfile;
  incidentType?: string;
  language: AppLanguage;
}

export const WhatsAppDispatchModal: React.FC<WhatsAppDispatchModalProps> = ({
  isOpen,
  onClose,
  coords,
  address,
  medicalProfile,
  incidentType = 'Экстренная помощь',
  language,
}) => {
  const [copied, setCopied] = useState(false);
  const [customPhone, setCustomPhone] = useState('');
  const [sentContacts, setSentContacts] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const isKz = language === 'kz';

  const messageText = buildEmergencyWhatsAppMessage({
    fullName: medicalProfile.fullName,
    bloodGroup: medicalProfile.bloodGroup,
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    address,
    incidentType,
    language,
  });

  const handleSendToContact = (contact: IceContact) => {
    openWhatsAppChat(contact.phone, messageText);
    setSentContacts((prev) => ({ ...prev, [contact.id]: true }));
  };

  const handleSendToCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPhone.trim()) return;
    openWhatsAppChat(customPhone, messageText);
  };

  const handleSendToAll = () => {
    // Open the first primary contact immediately
    if (medicalProfile.iceContacts.length > 0) {
      medicalProfile.iceContacts.forEach((contact, idx) => {
        setTimeout(() => {
          openWhatsAppChat(contact.phone, messageText);
          setSentContacts((prev) => ({ ...prev, [contact.id]: true }));
        }, idx * 600);
      });
    } else {
      openWhatsAppChat('', messageText);
    }
  };

  const copyMessage = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 text-neutral-100 space-y-5 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-950/50 shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-white">
              {isKz ? 'WhatsApp арқылы SOS жіберу' : 'Отправка SOS в WhatsApp доверенным'}
            </h3>
            <p className="text-xs text-neutral-400">
              {isKz
                ? 'Геолокация және «Көмек қажет» мәтіні автоматты түрде қосылады'
                : 'Геопозиция и текст «Требуется помощь» сформированы'}
            </p>
          </div>
        </div>

        {/* Emergency Alert Tag */}
        <div className="p-3 rounded-2xl bg-red-950/40 border border-red-500/40 text-xs flex items-center gap-2.5 text-red-300">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>
            {isKz
              ? 'Төмендегі сенімді адамдарға дәл координаттар мен көмек сұрауы жіберіледі'
              : 'Доверенные контакты мгновенно получат точные координаты и просьбу о помощи'}
          </span>
        </div>

        {/* Trusted Contacts List */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-neutral-300 uppercase tracking-wide">
              {isKz ? 'Сенімді байланыс нөмірлері (ICE):' : 'Доверительные номера (ICE):'}
            </span>
            {medicalProfile.iceContacts.length > 1 && (
              <button
                onClick={handleSendToAll}
                className="text-emerald-400 font-bold hover:underline text-[11px]"
              >
                {isKz ? 'Барлығына жіберу' : 'Отправить всем'}
              </button>
            )}
          </div>

          {medicalProfile.iceContacts.length > 0 ? (
            <div className="space-y-2">
              {medicalProfile.iceContacts.map((contact) => {
                const isSent = !!sentContacts[contact.id];
                const clean = cleanPhoneNumberForWhatsApp(contact.phone);

                return (
                  <div
                    key={contact.id}
                    className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-emerald-500/50 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                        <span>{contact.name}</span>
                        {contact.isPrimary && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                            ОСНОВНОЙ
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-400 flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-neutral-500" />
                        <span>{contact.phone}</span>
                        <span className="text-neutral-600">· {contact.relationship}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSendToContact(contact)}
                      className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 active:scale-95 transition-all shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSent ? (isKz ? 'Қайта ашу' : 'Открыто') : 'WhatsApp'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-400 text-center">
              Доверительные контакты еще не добавлены в медкарту.
            </div>
          )}
        </div>

        {/* Send to any other custom number */}
        <form onSubmit={handleSendToCustom} className="pt-2 border-t border-neutral-800/80 space-y-2">
          <span className="text-[11px] font-semibold text-neutral-400 block">
            {isKz ? 'Басқа кез келген нөмірге WhatsApp ашу:' : 'Или отправить на другой номер WhatsApp:'}
          </span>
          <div className="flex items-center gap-2 text-xs">
            <input
              type="tel"
              value={customPhone}
              onChange={(e) => setCustomPhone(e.target.value)}
              placeholder="+7 701 000 00 00"
              className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!customPhone.trim()}
              className="py-2 px-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-emerald-400 font-bold border border-neutral-700 transition-colors"
            >
              Отправить
            </button>
          </div>
        </form>

        {/* Message Preview Collapsible */}
        <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-2 text-xs">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="font-semibold text-[11px]">Текст готового сообщения:</span>
            <button
              onClick={copyMessage}
              className="text-cyan-400 font-mono text-[11px] flex items-center gap-1 hover:underline"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Скопировано' : 'Копировать'}</span>
            </button>
          </div>
          <pre className="font-mono text-[10px] text-neutral-300 whitespace-pre-wrap bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800/80 max-h-32 overflow-y-auto">
            {messageText}
          </pre>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs"
        >
          {isKz ? 'Жабу' : 'Закрыть'}
        </button>
      </div>
    </div>
  );
};
