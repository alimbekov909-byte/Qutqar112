import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  Bot,
  HeartPulse,
  BookOpen,
  UserCheck,
  Radio,
} from 'lucide-react';
import { Header } from './components/Header';
import { SosTriggerView } from './components/SosTriggerView';
import { AiAssistantView } from './components/AiAssistantView';
import { RescueToolsView } from './components/RescueToolsView';
import { EmergencyGuidesView } from './components/EmergencyGuidesView';
import { MedicalCardView } from './components/MedicalCardView';
import { SosActiveModal } from './components/SosActiveModal';
import { InstallAppModal } from './components/InstallAppModal';
import { useGeolocation } from './hooks/useGeolocation';
import { usePWAInstall } from './hooks/usePWAInstall';
import {
  IncidentCategory,
  AppLanguage,
  MedicalProfile,
} from './types/emergency';
import { INITIAL_MEDICAL_PROFILE } from './utils/offlineData';

export default function App() {
  const { coords, address, batteryLevel } = useGeolocation();
  const { isInstalled } = usePWAInstall();
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(true);

  // Language state (persisted)
  const [language, setLanguage] = useState<AppLanguage>(() => {
    return (localStorage.getItem('qutqar_lang') as AppLanguage) || 'ru';
  });

  // Medical profile state (persisted)
  const [medicalProfile, setMedicalProfile] = useState<MedicalProfile>(() => {
    const saved = localStorage.getItem('qutqar_medical_profile');
    return saved ? JSON.parse(saved) : INITIAL_MEDICAL_PROFILE;
  });

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'sos' | 'ai' | 'tools' | 'guides' | 'profile'>('sos');

  // Emergency SOS active overlay modal
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [selectedIncidentCategory, setSelectedIncidentCategory] = useState<IncidentCategory>('medical');

  // AI assistant deep query parameters
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string>('');
  const [aiInitialCategory, setAiInitialCategory] = useState<IncidentCategory>('medical');

  const handleLanguageChange = (lang: AppLanguage) => {
    setLanguage(lang);
    localStorage.setItem('qutqar_lang', lang);
  };

  const handleUpdateProfile = (profile: MedicalProfile) => {
    setMedicalProfile(profile);
    localStorage.setItem('qutqar_medical_profile', JSON.stringify(profile));
  };

  const handleOpenAiTriage = (category: IncidentCategory, initialPrompt?: string) => {
    setAiInitialCategory(category);
    if (initialPrompt) setAiInitialPrompt(initialPrompt);
    setActiveTab('ai');
  };

  const handleActivateEmergency = (category: IncidentCategory) => {
    setSelectedIncidentCategory(category);
    setIsSosModalOpen(true);
  };

  const handleOpenCprTool = () => {
    setActiveTab('tools');
  };

  const isKz = language === 'kz';

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-red-500 selection:text-white">
      {/* 1. Universal Top Bar */}
      <Header
        coords={coords}
        address={address}
        language={language}
        onLanguageChange={handleLanguageChange}
        onTriggerSos={() => handleActivateEmergency('medical')}
        onOpenInstall={() => setIsInstallModalOpen(true)}
        batteryLevel={batteryLevel}
      />

      {/* Optional Install Prompt Banner (if not running standalone) */}
      {!isInstalled && showInstallBanner && (
        <div className="bg-gradient-to-r from-red-950/80 via-neutral-900 to-neutral-900 border-b border-red-500/30 px-4 py-2">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 truncate">
              <span className="text-red-400">📲</span>
              <span className="text-neutral-200 truncate">
                {isKz
                  ? 'Төтенше жағдайда оффлайн жұмыс істеу үшін қосымшаны телефонға орнатыңыз'
                  : 'Установите «Qutqar 112» на телефон для оффлайн-работы при ЧС'}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsInstallModalOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] transition-colors"
              >
                {isKz ? 'Орнату' : 'Установить'}
              </button>
              <button
                onClick={() => setShowInstallBanner(false)}
                className="text-neutral-500 hover:text-neutral-300 text-xs px-1"
                title="Скрыть"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Content Canvas (Mobile-first responsive container) */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-4 mb-20">
        {activeTab === 'sos' && (
          <SosTriggerView
            coords={coords}
            address={address}
            medicalProfile={medicalProfile}
            language={language}
            onOpenAiTriage={handleOpenAiTriage}
            onActivateEmergency={handleActivateEmergency}
            batteryLevel={batteryLevel}
          />
        )}

        {activeTab === 'ai' && (
          <AiAssistantView
            coords={coords}
            address={address}
            medicalProfile={medicalProfile}
            language={language}
            initialCategory={aiInitialCategory}
            initialPrompt={aiInitialPrompt}
            onOpenCprTool={handleOpenCprTool}
          />
        )}

        {activeTab === 'tools' && (
          <RescueToolsView
            coords={coords}
            language={language}
            initialTool="cpr"
          />
        )}

        {activeTab === 'guides' && (
          <EmergencyGuidesView
            language={language}
            onOpenGuideInAi={(topic) => handleOpenAiTriage('general', `Что делать при: ${topic}`)}
          />
        )}

        {activeTab === 'profile' && (
          <MedicalCardView
            medicalProfile={medicalProfile}
            onUpdateProfile={handleUpdateProfile}
            language={language}
            coords={coords}
            address={address}
          />
        )}
      </main>

      {/* 3. Ergonomic Bottom Tab Bar (Thumb Zone anchor) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 backdrop-blur-md border-t border-neutral-800 pb-safe">
        <div className="max-w-2xl mx-auto grid grid-cols-5 items-center h-16 px-1">
          {/* Tab 1: SOS Button */}
          <button
            onClick={() => setActiveTab('sos')}
            className={`min-h-[44px] flex flex-col items-center justify-center transition-colors ${
              activeTab === 'sos'
                ? 'text-red-500 font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeTab === 'sos' ? 'bg-red-500/20' : ''}`}>
              <AlertOctagon className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
              {isKz ? 'SOS Пульт' : 'SOS 112'}
            </span>
          </button>

          {/* Tab 2: AI Triage */}
          <button
            onClick={() => setActiveTab('ai')}
            className={`min-h-[44px] flex flex-col items-center justify-center transition-colors ${
              activeTab === 'ai'
                ? 'text-cyan-400 font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeTab === 'ai' ? 'bg-cyan-500/20' : ''}`}>
              <Bot className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
              {isKz ? 'ИИ-Көмек' : 'ИИ-Триаж'}
            </span>
          </button>

          {/* Tab 3: Rescue Tools (CPR, Siren, Strobe, Radar) */}
          <button
            onClick={() => setActiveTab('tools')}
            className={`min-h-[44px] flex flex-col items-center justify-center transition-colors ${
              activeTab === 'tools'
                ? 'text-amber-400 font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeTab === 'tools' ? 'bg-amber-500/20' : ''}`}>
              <HeartPulse className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
              {isKz ? 'Құралдар' : 'СЛР/Сирена'}
            </span>
          </button>

          {/* Tab 4: Emergency Protocols & Go-Bag */}
          <button
            onClick={() => setActiveTab('guides')}
            className={`min-h-[44px] flex flex-col items-center justify-center transition-colors ${
              activeTab === 'guides'
                ? 'text-emerald-400 font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeTab === 'guides' ? 'bg-emerald-500/20' : ''}`}>
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
              {isKz ? 'Гайдтар' : 'База ЧС'}
            </span>
          </button>

          {/* Tab 5: Medical Card & ICE */}
          <button
            onClick={() => setActiveTab('profile')}
            className={`min-h-[44px] flex flex-col items-center justify-center transition-colors ${
              activeTab === 'profile'
                ? 'text-purple-400 font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeTab === 'profile' ? 'bg-purple-500/20' : ''}`}>
              <UserCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
              {isKz ? 'Медкарта' : 'Медкарта'}
            </span>
          </button>
        </div>
      </nav>

      {/* 4. Active SOS Emergency Modal */}
      {isSosModalOpen && (
        <SosActiveModal
          category={selectedIncidentCategory}
          coords={coords}
          address={address}
          medicalProfile={medicalProfile}
          language={language}
          onClose={() => setIsSosModalOpen(false)}
          onOpenAi={handleOpenAiTriage}
        />
      )}

      {/* 5. Install PWA Guide Modal */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        language={language}
      />
    </div>
  );
}
