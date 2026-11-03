import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Heart,
  PhoneCall,
  Plus,
  Trash2,
  AlertTriangle,
  FileBadge,
  Save,
  Check,
  Eye,
  X,
  Share2,
  MessageSquare,
} from 'lucide-react';
import { MedicalProfile, IceContact, AppLanguage, Coordinates } from '../types/emergency';
import { INITIAL_MEDICAL_PROFILE } from '../utils/offlineData';
import { buildEmergencyWhatsAppMessage, openWhatsAppChat } from '../utils/whatsappHelper';

interface MedicalCardViewProps {
  medicalProfile: MedicalProfile;
  onUpdateProfile: (profile: MedicalProfile) => void;
  language: AppLanguage;
  coords?: Coordinates;
  address?: string;
}

export const MedicalCardView: React.FC<MedicalCardViewProps> = ({
  medicalProfile,
  onUpdateProfile,
  language,
  coords,
  address = 'г. Алматы',
}) => {
  const [profile, setProfile] = useState<MedicalProfile>(medicalProfile);
  const [isSaved, setIsSaved] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRelation, setNewContactRelation] = useState('');

  const isKz = language === 'kz';

  const sendWhatsAppToContact = (contact: IceContact) => {
    const message = buildEmergencyWhatsAppMessage({
      fullName: profile.fullName,
      bloodGroup: profile.bloodGroup,
      latitude: coords?.latitude || 43.238942,
      longitude: coords?.longitude || 76.889709,
      accuracy: coords?.accuracy,
      address,
      incidentType: 'Экстренная помощь (SOS Qutqar 112)',
      language,
    });
    openWhatsAppChat(contact.phone, message);
  };

  useEffect(() => {
    setProfile(medicalProfile);
  }, [medicalProfile]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(profile);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const addIceContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) return;

    const newContact: IceContact = {
      id: `ice-${Date.now()}`,
      name: newContactName.trim(),
      phone: newContactPhone.trim(),
      relationship: newContactRelation.trim() || 'Близкий',
      isPrimary: profile.iceContacts.length === 0,
    };

    const updated = {
      ...profile,
      iceContacts: [...profile.iceContacts, newContact],
    };
    setProfile(updated);
    onUpdateProfile(updated);
    setNewContactName('');
    setNewContactPhone('');
    setNewContactRelation('');
  };

  const removeIceContact = (id: string) => {
    const updated = {
      ...profile,
      iceContacts: profile.iceContacts.filter((c) => c.id !== id),
    };
    setProfile(updated);
    onUpdateProfile(updated);
  };

  const bloodGroups = [
    'O (I) Rh+',
    'O (I) Rh-',
    'A (II) Rh+',
    'A (II) Rh-',
    'B (III) Rh+',
    'B (III) Rh-',
    'AB (IV) Rh+',
    'AB (IV) Rh-',
  ];

  return (
    <div className="space-y-4 pb-8">
      {/* 1. Medical Badge Trigger */}
      <div className="bg-gradient-to-r from-red-950/60 to-neutral-900 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
            <FileBadge className="w-4 h-4 text-red-400" />
            <span>{isKz ? 'Дәрігерлерге арналған жедел медкарта' : 'Медицинский ID для врачей и скорой'}</span>
          </h3>
          <p className="text-[11px] text-neutral-300 mt-0.5">
            {isKz
              ? 'Ес-түссіз кезде құтқарушыларға телефоннан көрсету үшін'
              : 'Разверните на весь экран, если не можете говорить'}
          </p>
        </div>

        <button
          onClick={() => setShowBadgeModal(true)}
          className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition-transform active:scale-95 shadow-md shadow-red-950/40"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{isKz ? 'Ашу' : 'Показать'}</span>
        </button>
      </div>

      {/* 2. Fullscreen Paramedic Badge Modal */}
      {showBadgeModal && (
        <div className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-md p-6 flex flex-col justify-between overflow-y-auto">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2 text-red-500 font-extrabold text-sm uppercase tracking-wider">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <span>EMERGENCY MEDICAL ID / МЕДКАРТА</span>
            </div>
            <button
              onClick={() => setShowBadgeModal(false)}
              className="p-2 rounded-full bg-neutral-800 text-neutral-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="my-auto py-6 space-y-6 text-center">
            {/* Blood Group */}
            <div className="inline-block p-4 rounded-3xl bg-red-600/20 border-2 border-red-500 text-red-400 shadow-2xl">
              <span className="text-[11px] font-bold uppercase tracking-widest block text-red-300">
                Группа крови / Қан тобы
              </span>
              <span className="font-mono text-4xl sm:text-5xl font-black text-white mt-1 block">
                {profile.bloodGroup || 'НЕ УКАЗАНА'}
              </span>
            </div>

            {/* Patient Name */}
            <div>
              <h2 className="text-2xl font-black text-white">{profile.fullName || 'Пациент'}</h2>
              <p className="text-xs text-neutral-400 font-mono mt-0.5">
                Дата рождения: {profile.birthDate || 'Н/Д'}
              </p>
            </div>

            {/* Allergies & Illness Hazard Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40">
                <span className="font-bold text-amber-400 text-xs uppercase block">
                  ⚠️ АЛЛЕРГИИ / ДӘРІЛІК АЛЛЕРГИЯ
                </span>
                <p className="text-sm font-semibold text-white mt-1">
                  {profile.allergies || 'Нет известных аллергий'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-700">
                <span className="font-bold text-neutral-300 text-xs uppercase block">
                  ХРОНИЧЕСКИЕ ДИАГНОЗЫ / ПРЕПАРАТЫ
                </span>
                <p className="text-sm font-semibold text-white mt-1">
                  {profile.chronicIllness || 'Нет'} · {profile.dailyMedications || 'Нет препаратов'}
                </p>
              </div>
            </div>

            {/* Emergency Contacts */}
            {profile.iceContacts.length > 0 && (
              <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-left">
                <span className="font-bold text-neutral-400 text-xs uppercase block mb-2">
                  ЭКСТРЕННЫЕ КОНТАКТЫ (ICE):
                </span>
                <div className="space-y-2">
                  {profile.iceContacts.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white">{c.name}</span>{' '}
                        <span className="text-neutral-500">({c.relationship})</span>
                      </div>
                      <a
                        href={`tel:${c.phone}`}
                        className="font-mono text-emerald-400 font-bold bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800 flex items-center gap-1"
                      >
                        <PhoneCall className="w-3 h-3" />
                        <span>{c.phone}</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowBadgeModal(false)}
            className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs"
          >
            Закрыть экран врачей
          </button>
        </div>
      )}

      {/* 3. Editable Profile Form */}
      <form onSubmit={handleSave} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3.5">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
          <span className="text-xs font-bold text-neutral-200 uppercase tracking-wide">
            {isKz ? 'Жеке деректерді өңдеу' : 'Данные медицинской карты'}
          </span>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isSaved ? 'Сохранено' : 'Сохранить'}</span>
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="text-neutral-400 font-medium block mb-1">
              {isKz ? 'Аты-жөні (ФИО)' : 'ФИО владельца'}
            </label>
            <input
              type="text"
              value={profile.fullName}
              onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-neutral-400 font-medium block mb-1">
                {isKz ? 'Қан тобы' : 'Группа крови'}
              </label>
              <select
                value={profile.bloodGroup}
                onChange={(e) => setProfile({ ...profile, bloodGroup: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-red-500 font-mono text-xs"
              >
                {bloodGroups.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-neutral-400 font-medium block mb-1">
                {isKz ? 'Туған күні' : 'Дата рождения'}
              </label>
              <input
                type="date"
                value={profile.birthDate}
                onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-red-500 font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-neutral-400 font-medium block mb-1">
              {isKz ? 'Аллергиялар (дәрі-дәрмек, тағам)' : 'Аллергии (особенно антибиотики, новокаин)'}
            </label>
            <input
              type="text"
              value={profile.allergies}
              onChange={(e) => setProfile({ ...profile, allergies: e.target.value })}
              placeholder="Пенициллин, лидокаин, аспирин..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="text-neutral-400 font-medium block mb-1">
              {isKz ? 'Созылмалы аурулар' : 'Хронические заболевания'}
            </label>
            <input
              type="text"
              value={profile.chronicIllness}
              onChange={(e) => setProfile({ ...profile, chronicIllness: e.target.value })}
              placeholder="Астма, диабет 1 типа, гипертония, эпилепсия..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="text-neutral-400 font-medium block mb-1">
              {isKz ? 'Қабылдайтын дәрілері' : 'Ежедневные жизненно важные препараты'}
            </label>
            <input
              type="text"
              value={profile.dailyMedications}
              onChange={(e) => setProfile({ ...profile, dailyMedications: e.target.value })}
              placeholder="Инсулин, ингалятор, кардиопрепараты..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
            />
          </div>
        </div>
      </form>

      {/* 4. ICE Contacts Section */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3.5">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
          <span className="text-xs font-bold text-neutral-200 uppercase tracking-wide">
            {isKz ? 'ICE Экстренной байланыс адамдары' : 'Контакты ICE (In Case of Emergency)'}
          </span>
          <span className="text-[11px] text-neutral-400">
            {profile.iceContacts.length} контакта
          </span>
        </div>

        {/* Existing contacts */}
        <div className="space-y-2">
          {profile.iceContacts.map((contact) => (
            <div
              key={contact.id}
              className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3 text-xs"
            >
              <div>
                <div className="font-bold text-neutral-100">{contact.name}</div>
                <div className="text-[11px] text-neutral-400">
                  {contact.relationship} · <span className="font-mono text-neutral-300">{contact.phone}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => sendWhatsAppToContact(contact)}
                  className="p-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 flex items-center gap-1"
                  title="Отправить SOS геолокацию в WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
                <a
                  href={`tel:${contact.phone}`}
                  className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700"
                  title="Позвонить"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => removeIceContact(contact.id)}
                  className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-500 hover:text-red-400"
                  title="Удалить"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Contact Form */}
        <form onSubmit={addIceContact} className="pt-2 border-t border-neutral-800/80 space-y-2">
          <span className="text-[11px] font-semibold text-neutral-400 block">
            {isKz ? 'Жаңа контакт қосу' : 'Добавить экстренный контакт:'}
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <input
              type="text"
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              placeholder="Имя / Аты"
              className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none"
            />
            <input
              type="text"
              value={newContactRelation}
              onChange={(e) => setNewContactRelation(e.target.value)}
              placeholder="Кем приходится (Мама, Брат)"
              className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <input
              type="tel"
              value={newContactPhone}
              onChange={(e) => setNewContactPhone(e.target.value)}
              placeholder="+7 701 000 00 00"
              className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
            />
            <button
              type="submit"
              className="py-2 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold transition-colors active:scale-95"
            >
              Добавить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
