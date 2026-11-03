import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Backpack,
  CheckCircle2,
  Circle,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Building2,
  Flame,
  HeartPulse,
  Droplet,
  Activity,
  Car,
  Plus,
  Trash2,
  Search,
} from 'lucide-react';
import { EMERGENCY_GUIDES, INITIAL_GO_BAG_ITEMS } from '../utils/offlineData';
import { EmergencyGuideItem, GoBagItem, AppLanguage } from '../types/emergency';

interface EmergencyGuidesViewProps {
  language: AppLanguage;
  onOpenGuideInAi: (topic: string) => void;
}

export const EmergencyGuidesView: React.FC<EmergencyGuidesViewProps> = ({
  language,
  onOpenGuideInAi,
}) => {
  const [activeTab, setActiveTab] = useState<'guides' | 'gobag'>('guides');
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>('earthquake');
  const [searchQuery, setSearchQuery] = useState('');
  const [goBagItems, setGoBagItems] = useState<GoBagItem[]>(() => {
    const saved = localStorage.getItem('qutqar_gobag_items');
    return saved ? JSON.parse(saved) : INITIAL_GO_BAG_ITEMS;
  });
  const [newItemName, setNewItemName] = useState('');

  const isKz = language === 'kz';

  // Save go-bag items to localStorage
  useEffect(() => {
    localStorage.setItem('qutqar_gobag_items', JSON.stringify(goBagItems));
  }, [goBagItems]);

  const toggleGoBagItem = (id: string) => {
    setGoBagItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const newItem: GoBagItem = {
      id: `custom-${Date.now()}`,
      name: newItemName.trim(),
      nameKz: newItemName.trim(),
      category: 'tools',
      recommendedQty: '1 шт.',
      checked: true,
    };
    setGoBagItems((prev) => [newItem, ...prev]);
    setNewItemName('');
  };

  const removeItem = (id: string) => {
    setGoBagItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Readiness calculation
  const totalCount = goBagItems.length;
  const checkedCount = goBagItems.filter((i) => i.checked).length;
  const readinessPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  // Filter guides by search
  const filteredGuides = EMERGENCY_GUIDES.filter((g) => {
    const title = isKz ? g.titleKz : g.title;
    const summary = isKz ? g.summaryKz : g.summary;
    return (
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      summary.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getGuideIcon = (name: string) => {
    switch (name) {
      case 'Building2':
        return Building2;
      case 'Flame':
        return Flame;
      case 'HeartPulse':
        return HeartPulse;
      case 'Droplet':
        return Droplet;
      case 'Activity':
        return Activity;
      case 'Car':
        return Car;
      default:
        return AlertTriangle;
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Switch between Guides & Go-Bag */}
      <div className="grid grid-cols-2 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
        <button
          onClick={() => setActiveTab('guides')}
          className={`py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'guides'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span>{isKz ? 'ТЖ Хаттамалары (Оффлайн)' : 'Гайды МЧС (Оффлайн)'}</span>
        </button>

        <button
          onClick={() => setActiveTab('gobag')}
          className={`py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'gobag'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Backpack className="w-3.5 h-3.5 text-amber-400" />
          <span>
            {isKz ? 'Дабыл сөмкесі' : 'Тревожный чемодан'} ({readinessPercent}%)
          </span>
        </button>
      </div>

      {/* 1. EMERGENCY PROTOCOLS & GUIDES */}
      {activeTab === 'guides' && (
        <div className="space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isKz ? 'Хаттаманы іздеу...' : 'Поиск по инструкциям и ЧС...'}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Guide Cards */}
          <div className="space-y-2">
            {filteredGuides.map((guide) => {
              const Icon = getGuideIcon(guide.iconName);
              const isExpanded = selectedGuideId === guide.id;

              return (
                <div
                  key={guide.id}
                  className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setSelectedGuideId(isExpanded ? null : guide.id)}
                    className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-neutral-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-red-400 shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-neutral-100">
                          {isKz ? guide.titleKz : guide.title}
                        </h4>
                        <p className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                          {isKz ? guide.summaryKz : guide.summary}
                        </p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
                    )}
                  </button>

                  {/* Expanded Guide Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-neutral-800/80 space-y-3.5 text-xs">
                      {guide.phases.map((phase, pIdx) => (
                        <div key={pIdx} className="space-y-1.5">
                          <span className="font-bold text-cyan-400 text-[11px] uppercase tracking-wide block">
                            {isKz ? phase.phaseNameKz : phase.phaseName}
                          </span>
                          <ul className="space-y-1 text-neutral-300">
                            {(isKz ? phase.stepsKz : phase.steps).map((step, sIdx) => (
                              <li key={sIdx} className="flex items-start gap-2 leading-relaxed">
                                <span className="text-cyan-500 font-bold">•</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}

                      {/* Prohibitions */}
                      <div className="p-3 bg-red-950/30 border border-red-500/30 rounded-xl space-y-1">
                        <span className="font-bold text-red-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{isKz ? 'Қатаң тыйым салынады' : 'Категорически запрещено'}</span>
                        </span>
                        <ul className="space-y-1 text-red-200/90 text-[11px]">
                          {(isKz ? guide.prohibitionsKz : guide.prohibitions).map((p, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span>✕</span>
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* AI Assistant Deep Query */}
                      <button
                        onClick={() => onOpenGuideInAi(isKz ? guide.titleKz : guide.title)}
                        className="w-full py-2 px-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <span>Задать вопрос ИИ-диспетчеру по этой теме</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. EMERGENCY GO-BAG CHECKLIST */}
      {activeTab === 'gobag' && (
        <div className="space-y-4">
          {/* Readiness Dashboard */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-neutral-100 flex items-center gap-1.5">
                  <Backpack className="w-4 h-4 text-amber-400" />
                  <span>{isKz ? '«Дабыл чемоданының» дайындығы' : 'Готовность тревожного чемодана'}</span>
                </h3>
                <p className="text-[11px] text-neutral-400">
                  {isKz
                    ? 'Төтенше жағдайда 72 сағат автономиялық өмір сүру қоры'
                    : 'Официальный стандарт МЧС: запас на первые 72 часа ЧС'}
                </p>
              </div>
              <div className="text-right">
                <span className="font-mono text-2xl font-black text-amber-400 tabular-nums">
                  {readinessPercent}%
                </span>
                <span className="text-[10px] text-neutral-500 block">
                  {checkedCount} / {totalCount}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-neutral-950 overflow-hidden border border-neutral-800">
              <div
                className={`h-full transition-all duration-300 ${
                  readinessPercent >= 80
                    ? 'bg-emerald-500'
                    : readinessPercent >= 50
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${readinessPercent}%` }}
              />
            </div>
          </div>

          {/* Add custom item form */}
          <form onSubmit={handleAddCustomItem} className="flex items-center gap-2">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={isKz ? 'Жаңа зат қосу...' : 'Добавить свой предмет в чемоданчик...'}
              className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium active:scale-95 transition-transform shrink-0"
              title="Добавить"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          {/* Checklist Items */}
          <div className="space-y-2">
            {goBagItems.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                  item.checked
                    ? 'bg-neutral-950/60 border-neutral-800/60'
                    : 'bg-neutral-900 border-neutral-800'
                }`}
              >
                <button
                  onClick={() => toggleGoBagItem(item.id)}
                  className="flex items-start gap-3 flex-1 text-left"
                >
                  <div className="mt-0.5 shrink-0">
                    {item.checked ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-neutral-500" />
                    )}
                  </div>
                  <div>
                    <span
                      className={`text-xs leading-relaxed block ${
                        item.checked ? 'line-through text-neutral-500' : 'font-medium text-neutral-200'
                      }`}
                    >
                      {isKz ? item.nameKz : item.name}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono mt-0.5 block">
                      Норма: {item.recommendedQty}
                    </span>
                  </div>
                </button>

                {item.id.startsWith('custom-') && (
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-neutral-600 hover:text-red-400 p-1"
                    title="Удалить"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
