import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Copy,
  Check,
  HeartPulse,
  Flame,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  IncidentCategory,
  AiTriageResponse,
  Coordinates,
  MedicalProfile,
  AppLanguage,
} from '../types/emergency';
import { QUICK_AI_TRIAGE_CHIPS } from '../utils/offlineData';
import { audioSynthesizer } from '../utils/audioSynthesizer';

interface AiAssistantViewProps {
  initialCategory?: IncidentCategory;
  initialPrompt?: string;
  coords: Coordinates;
  address: string;
  medicalProfile: MedicalProfile;
  language: AppLanguage;
  onOpenCprTool: () => void;
}

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({
  initialCategory = 'medical',
  initialPrompt = '',
  coords,
  address,
  medicalProfile,
  language,
  onOpenCprTool,
}) => {
  const [inputText, setInputText] = useState(initialPrompt || '');
  const [selectedCategory, setSelectedCategory] = useState<IncidentCategory>(initialCategory);
  const [isLoading, setIsLoading] = useState(false);
  const [triageResult, setTriageResult] = useState<AiTriageResponse | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedDispatcher, setCopiedDispatcher] = useState(false);
  const recognitionRef = useRef<any>(null);

  const isKz = language === 'kz';
  const isEn = language === 'en';

  // Request AI Triage from server
  const fetchTriage = async (promptQuery: string, cat: IncidentCategory = selectedCategory) => {
    if (!promptQuery.trim()) return;
    setIsLoading(true);
    setCompletedSteps({});
    audioSynthesizer.stopSpeaking();
    setIsSpeaking(false);

    try {
      const response = await fetch('/api/emergency/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          situation: promptQuery,
          category: cat,
          location: {
            latitude: coords.latitude,
            longitude: coords.longitude,
            address,
          },
          patientDetails: {
            bloodGroup: medicalProfile.bloodGroup,
            allergies: medicalProfile.allergies,
            chronicIllness: medicalProfile.chronicIllness,
          },
          language,
        }),
      });

      const json = await response.json();
      if (json.data) {
        setTriageResult(json.data);
      }
    } catch (err) {
      console.error('Error fetching AI emergency triage:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Run initial prompt if provided
  useEffect(() => {
    if (initialPrompt) {
      fetchTriage(initialPrompt, initialCategory);
    } else {
      // Default initial triage scenario
      fetchTriage(
        isKz
          ? 'Адам ес-түссіз жатыр, дем алмайды'
          : 'Человек без сознания, не реагирует на слова',
        'medical'
      );
    }
  }, [initialCategory]);

  // Speech Recognition setup (Web Speech API)
  const toggleListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        isKz
          ? 'Браузерде дауыспен енгізу қолдау таппайды. Мәтінді пернетақтамен енгізіңіз.'
          : 'Голосовой ввод не поддерживается вашим браузером. Введите текст вручную.'
      );
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      const recognition = new SpeechRecognition();
      recognition.lang = language === 'kz' ? 'kk-KZ' : language === 'en' ? 'en-US' : 'ru-RU';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        fetchTriage(transcript, selectedCategory);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    }
  };

  const handleChipClick = (chip: (typeof QUICK_AI_TRIAGE_CHIPS)[0]) => {
    const text = isKz ? chip.labelKz : chip.label;
    setInputText(text);
    setSelectedCategory(chip.category as IncidentCategory);
    fetchTriage(text, chip.category as IncidentCategory);
  };

  const toggleStep = (index: number) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Voice narration of instructions
  const toggleSpeech = () => {
    if (!triageResult) return;
    if (isSpeaking) {
      audioSynthesizer.stopSpeaking();
      setIsSpeaking(false);
    } else {
      const fullText = `${triageResult.title}. Срочное действие: ${triageResult.immediateAction}. Шаги: ${triageResult.stepByStepInstructions.join('. ')}. Категорически запрещено: ${triageResult.strictlyProhibited.join('. ')}`;
      audioSynthesizer.speak(fullText, language);
      setIsSpeaking(true);
    }
  };

  const copyDispatcherBrief = () => {
    if (triageResult?.dispatcherBrief) {
      navigator.clipboard.writeText(triageResult.dispatcherBrief);
      setCopiedDispatcher(true);
      setTimeout(() => setCopiedDispatcher(false), 2000);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header Info */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-neutral-100 flex items-center gap-1.5">
                {isKz ? 'ИИ-Төтенше диспетчер' : 'ИИ-Диспетчер ЧС и Первой Помощи'}
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-mono">
                  Gemini 3.8
                </span>
              </h2>
              <p className="text-[11px] text-neutral-400">
                {isKz
                  ? 'Жедел көмек келгенге дейін нақты алгоритмдер мен әрекеттер'
                  : 'Пошаговый протокол спасения до прибытия оперативных служб'}
              </p>
            </div>
          </div>
        </div>

        {/* Input Form with Mic */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchTriage(inputText);
          }}
          className="mt-3 flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isKz
                  ? 'Не болды? (мыс: қан кету, өрт, есінен танды)...'
                  : 'Опишите ЧС (напр: сильное кровотечение, задымление, задыхается)...'
              }
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none transition-colors pr-9"
            />
            <button
              type="button"
              onClick={toggleListening}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title={isListening ? 'Идет запись...' : 'Голосовой ввод ситуации'}
            >
              {isListening ? <Mic className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium transition-all active:scale-95 shrink-0"
            title="Получить инструкции"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Triage Scenario Chips */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {QUICK_AI_TRIAGE_CHIPS.map((chip) => (
            <button
              key={chip.id}
              onClick={() => handleChipClick(chip)}
              className="px-2.5 py-1 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-[11px] text-neutral-300 whitespace-nowrap transition-colors shrink-0"
            >
              {isKz ? chip.labelKz : chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 text-center space-y-2">
          <div className="w-8 h-8 mx-auto border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-neutral-200">
            {isKz ? 'Шұғыл іс-қимыл хаттамасы жасалуда...' : 'Формирование протокола первой помощи...'}
          </p>
          <p className="text-[11px] text-neutral-500">
            {isKz ? 'Қауіп деңгейі бағалануда' : 'Анализируются угрозы жизни и риски'}
          </p>
        </div>
      )}

      {/* Triage Guidance Results */}
      {triageResult && !isLoading && (
        <div className="space-y-3">
          {/* Urgency Badge & Speech narration bar */}
          <div className="flex items-center justify-between gap-2">
            <div
              className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border ${
                triageResult.statusLevel === 'CRITICAL'
                  ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                  : triageResult.statusLevel === 'HIGH'
                  ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                  : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>
                {triageResult.statusLevel === 'CRITICAL'
                  ? isKz
                    ? 'АСА ҚАУІПТІ ДЕҢГЕЙ'
                    : 'КРИТИЧЕСКИЙ УРОВЕНЬ УГРОЗЫ'
                  : triageResult.statusLevel === 'HIGH'
                  ? isKz
                    ? 'ЖОҒАРЫ ҚАУІП'
                    : 'ВЫСОКАЯ ОПАСНОСТЬ'
                  : isKz
                  ? 'ОРТАША ҚАУІП'
                  : 'СРЕДНЯЯ ОПАСНОСТЬ'}
              </span>
            </div>

            {/* Audio Speech Readout Button */}
            <button
              onClick={toggleSpeech}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isSpeaking
                  ? 'bg-cyan-500 text-neutral-950 border-cyan-400 animate-pulse'
                  : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
              }`}
              title="Озвучить инструкцию голосом"
            >
              {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{isSpeaking ? (isKz ? 'Тоқтату' : 'Стоп') : isKz ? 'Дауыстап оқу' : 'Озвучить'}</span>
            </button>
          </div>

          {/* Diagnosis / Situation Title */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5">
            <h3 className="font-extrabold text-base text-white">{triageResult.title}</h3>

            {/* CPR Shortcut Button if resuscitation is required */}
            {triageResult.cprRequired && (
              <button
                onClick={onOpenCprTool}
                className="mt-2.5 w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-950/40 transition-transform active:scale-95"
              >
                <HeartPulse className="w-4 h-4 animate-pulse" />
                <span>{isKz ? 'СЛР-Метрономды іске қосу (110 соққы/мин)' : 'Включить СЛР-Метроном (110 уд/мин)'}</span>
              </button>
            )}
          </div>

          {/* 30-Second Golden Rule (Immediate Action) */}
          <div className="bg-red-950/40 border border-red-500/40 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-red-400 text-xs font-extrabold tracking-wider uppercase mb-1.5">
              <ShieldAlert className="w-4 h-4" />
              <span>{isKz ? 'Алғашқы 30 секунд: Дереу жасаңыз' : 'Сделайте прямо сейчас (первые 30 сек)'}</span>
            </div>
            <p className="text-sm font-bold text-red-100 leading-snug">
              {triageResult.immediateAction}
            </p>
          </div>

          {/* Interactive Step-by-Step Checklist */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="text-xs font-bold text-neutral-200 uppercase tracking-wide">
                {isKz ? 'Қадамдық нұсқаулықтар' : 'Пошаговые действия (отмечайте выполнение)'}
              </span>
              <span className="text-[11px] font-mono text-neutral-400">
                {Object.values(completedSteps).filter(Boolean).length} /{' '}
                {triageResult.stepByStepInstructions.length}
              </span>
            </div>

            <div className="space-y-2">
              {triageResult.stepByStepInstructions.map((step, idx) => {
                const isDone = !!completedSteps[idx];
                return (
                  <button
                    key={idx}
                    onClick={() => toggleStep(idx)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                      isDone
                        ? 'bg-neutral-950/80 border-emerald-500/30 text-neutral-400'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-100 hover:border-neutral-700'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-neutral-500" />
                      )}
                    </div>
                    <span
                      className={`text-xs leading-relaxed ${
                        isDone ? 'line-through text-neutral-500' : 'font-medium'
                      }`}
                    >
                      {step}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Strictly Prohibited Section */}
          {triageResult.strictlyProhibited?.length > 0 && (
            <div className="bg-neutral-900 border border-amber-500/30 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>{isKz ? 'Қатаң тыйым салынады' : 'Категорически запрещено (Ошибки)'}</span>
              </div>
              <ul className="space-y-1.5 text-xs text-neutral-300">
                {triageResult.strictlyProhibited.map((err, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">✕</span>
                    <span>{err}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* What to tell 112 Dispatcher (Verbatim Phrase) */}
          {triageResult.dispatcherBrief && (
            <div className="bg-neutral-900 border border-cyan-500/30 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wide">
                  {isKz ? '112 диспетчеріне не айту керек' : 'Что сказать диспетчеру 112 при звонке'}
                </span>
                <button
                  onClick={copyDispatcherBrief}
                  className="flex items-center gap-1 text-[11px] text-cyan-300 hover:text-cyan-200 font-mono"
                >
                  {copiedDispatcher ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" /> Скопировано
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Копировать
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-cyan-100 leading-relaxed italic">
                {triageResult.dispatcherBrief}
              </div>

              <div className="flex items-center justify-end">
                <a
                  href="tel:112"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
                >
                  <span>Набрать 112 прямо сейчас</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Follow-up check question if any */}
          {triageResult.followUpCheck && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 flex items-center justify-between text-xs text-neutral-300">
              <span className="font-medium">{triageResult.followUpCheck}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchTriage(`Да, ${triageResult.followUpCheck}`)}
                  className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] font-bold"
                >
                  Да
                </button>
                <button
                  onClick={() => fetchTriage(`Нет, ${triageResult.followUpCheck}`)}
                  className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] font-bold"
                >
                  Нет
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
