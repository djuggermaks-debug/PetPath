import { useState, useEffect } from 'react';
import type { Pet } from '../types';
import { Pencil, Trash2 } from 'lucide-react';
import { MODULE_REGISTRY } from '../modules/registry';
import { InputBar } from './InputBar';
import { PetCard } from './PetCard';
import { VetCard } from './VetCard';
import { VetAnalysis } from './VetAnalysis';
import { QuestionPrompt } from './QuestionPrompt';
import { OnboardingForm } from './OnboardingForm';
import { Paywall } from './Paywall';
import { DevPanel } from '../dev/DevPanel';
import { parseUserText, parseImageData } from '../ai/accountant';
import { analyzeWithVetAgent } from '../ai/vetAgent';
import { getPendingQuestions } from '../ai/questions';
import { loadModuleData, saveModuleData, deletePet, updatePet } from '../storage';
import { devLogger } from '../dev/logger';
import type { UserInfo } from '../hooks/useUserStatus';

const DEV_MODE = new URLSearchParams(window.location.search).has('dev');

const PHOTO_MODULES = new Set(['health', 'allergies', 'items']);

async function compressImage(base64: string, mimeType: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const MAX = 800;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { devLogger.log('error', 'compressImage: нет canvas context, берём оригинал', null); resolve(base64); return; }
        ctx.drawImage(img, 0, 0, width, height);
        const result = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
        devLogger.log('save', `Фото сжато: ${Math.round(result.length / 1024)}KB`, null);
        resolve(result || base64);
      } catch (e) {
        devLogger.log('error', 'compressImage: ошибка сжатия, берём оригинал', { error: String(e) });
        resolve(base64);
      }
    };
    img.onerror = () => {
      devLogger.log('error', 'compressImage: ошибка загрузки img, берём оригинал', null);
      resolve(base64);
    };
    img.src = `data:${mimeType};base64,${base64}`;
  });
}

interface PetFolderProps {
  pet: Pet;
  onAddPet: () => void;
  allPets: Pet[];
  onSelectPet: (pet: Pet) => void;
  onDeletePet: (petId: string) => void;
  onUpdatePet: (pet: Pet) => void;
  onShowHelp: () => void;
  userStatus: UserInfo;
}

export function PetFolder({ pet, onAddPet, allPets, onSelectPet, onDeletePet, onUpdatePet, onShowHelp, userStatus }: PetFolderProps) {
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [parseResult, setParseResult] = useState<{ count: number; modules: string[] } | null>(null);
  const [vetAdvice, setVetAdvice] = useState<Awaited<ReturnType<typeof analyzeWithVetAgent>> | null>(null);
  const [vetCardData, setVetCardData] = useState<Record<string, unknown[]> | null>(null);
  const [questions, setQuestions] = useState<ReturnType<typeof getPendingQuestions>>([]);
  const [inputPrefill, setInputPrefill] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const loadQuestions = async () => {
    const allData: Record<string, unknown[]> = {};
    for (const mod of MODULE_REGISTRY) {
      allData[mod.id] = await loadModuleData(pet.id, mod.id);
    }
    setQuestions(getPendingQuestions(pet, allData));
  };

  useEffect(() => { loadQuestions(); }, [pet.id]);

  const activeModuleData = MODULE_REGISTRY.find(m => m.id === activeModule);
  const ActiveComponent = activeModuleData?.component;

  const calcAge = (birthDate: string) => {
    if (!birthDate) return '—';
    const birth = new Date(birthDate);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (months < 12) return `${months} мес.`;
    return `${Math.floor(months / 12)} л.`;
  };

  const handleSend = async (text: string, image?: { base64: string; mimeType: string }) => {
    setParsing(true);
    setParseResult(null);
    try {
      const atoms = image
        ? await parseImageData(image.base64, image.mimeType, text, pet)
        : await parseUserText(text, pet);
      const compressedPhoto = image ? await compressImage(image.base64, image.mimeType) : undefined;

      if (atoms.length === 0) {
        setParseResult({ count: 0, modules: [] });
        return;
      }

      // Handle profile atoms separately
      const profileAtoms = atoms.filter(a => a.module === 'profile');
      const moduleAtoms = atoms.filter(a => a.module !== 'profile');

      if (profileAtoms.length > 0) {
        const profileUpdates = Object.assign({}, ...profileAtoms.map(a => a.data));
        devLogger.log('save', 'Обновлён профиль питомца', profileUpdates);
        const updated = await updatePet(pet.id, profileUpdates as Partial<Pet>);
        onUpdatePet(updated);
      }

      // Save each module atom
      for (const atom of moduleAtoms) {
        const existing = await loadModuleData(pet.id, atom.module);
        const photo = compressedPhoto && PHOTO_MODULES.has(atom.module) ? { _photo: compressedPhoto } : {};
        const entry = { id: crypto.randomUUID(), ...atom.data, ...photo };
        await saveModuleData(pet.id, atom.module, [entry, ...existing]);
        devLogger.log('save', `Сохранено в модуль: ${atom.module}`, entry);
      }
      (window as any).__devRefresh?.();

      const allSaved = [...profileAtoms, ...moduleAtoms];
      const modules = [...new Set(allSaved.map(a => {
        if (a.module === 'profile') return '👤 Профиль';
        const mod = MODULE_REGISTRY.find(m => m.id === a.module);
        return mod ? `${mod.icon} ${mod.label}` : a.module;
      }))];
      setParseResult({ count: allSaved.length, modules });
      loadQuestions();

      // Refresh active module if it received new data
      if (activeModule && atoms.some(a => a.module === activeModule)) {
        setActiveModule(null);
        setTimeout(() => setActiveModule(activeModule), 50);
      }
    } finally {
      setParsing(false);
    }
  };

  const handleShowVet = async () => {
    const allData: Record<string, unknown[]> = {};
    for (const mod of MODULE_REGISTRY) {
      allData[mod.id] = await loadModuleData(pet.id, mod.id);
    }
    setVetCardData(allData);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setVetAdvice(null);
    try {
      const allData: Record<string, unknown[]> = {};
      for (const mod of MODULE_REGISTRY) {
        allData[mod.id] = await loadModuleData(pet.id, mod.id);
      }
      const advice = await analyzeWithVetAgent(pet, allData);
      devLogger.log('analyze', 'Ответ ветеринарного агента', advice);
      (window as any).__devRefresh?.();
      setVetAdvice(advice);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="folder-container">
      {/* Top pet tabs */}
      <div className="pet-tabs-bar">
        {allPets.map(p => (
          <button key={p.id}
            className={`pet-tab ${p.id === pet.id ? 'pet-tab--active' : ''}`}
            onClick={() => onSelectPet(p)}>
            {p.photo
              ? <img src={p.photo} alt={p.name} className="pet-tab-photo" />
              : <span className="pet-tab-emoji">{p.species === 'dog' ? '🐕' : p.species === 'bird' ? '🐦' : '🐈'}</span>
            }
            <span className="pet-tab-name">{p.name}</span>
          </button>
        ))}
        <button className="pet-tab pet-tab--add" onClick={onAddPet}><span>+</span></button>
      </div>

      {/* Folder body */}
      <div className="folder-body">
        {/* Side tabs */}
        <div className="side-tabs">
          {MODULE_REGISTRY.map(mod => {
            const locked = mod.isPremium && !userStatus.isPremium;
            return (
              <button key={mod.id}
                className={`side-tab ${activeModule === mod.id ? 'side-tab--active' : ''} ${mod.isPremium ? 'side-tab--premium' : ''} ${locked ? 'side-tab--locked' : ''}`}
                style={{ '--tab-color': mod.color } as React.CSSProperties}
                onClick={() => locked ? setShowPaywall(true) : setActiveModule(prev => prev === mod.id ? null : mod.id)}
                title={mod.label}>
                <span className="side-tab-icon">{locked ? '🔒' : mod.icon}</span>
                <span className="side-tab-label">{mod.labelShort}</span>
              </button>
            );
          })}
        </div>

        {/* Main content */}
        <div className="folder-content scrollable">
          {userStatus.status === 'trial' && (
            <div className="trial-banner" onClick={() => setShowPaywall(true)}>
              ⏳ Пробный период: осталось {userStatus.trialDaysLeft} дн. · Купить Premium →
            </div>
          )}
          {userStatus.status === 'trial_expired' && (
            <div className="trial-banner trial-banner--expired" onClick={() => setShowPaywall(true)}>
              🔒 Пробный период закончился · Купить Premium →
            </div>
          )}
          <div className="case-header">
            <div className="case-number font-typewriter">{pet.caseNumber}</div>
            <div className="case-header-actions">
              <button className="help-btn" onClick={onShowHelp} title="Справка и тариф">?</button>
              <button className="edit-pet-btn" onClick={() => setShowEditForm(true)} title="Редактировать профиль">
                <Pencil size={14} />
              </button>
              {!confirmDelete ? (
                <button className="delete-pet-btn" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={14} />
                </button>
              ) : (
                <div className="delete-confirm">
                  <span>Удалить {pet.name}?</span>
                  <button className="delete-confirm-yes" onClick={async () => { await deletePet(pet.id); onDeletePet(pet.id); }}>Да</button>
                  <button className="delete-confirm-no" onClick={() => setConfirmDelete(false)}>Нет</button>
                </div>
              )}
            </div>
            <button
              className={`analyze-btn font-typewriter ${analyzing ? 'analyze-btn--loading' : ''}`}
              onClick={handleAnalyze} disabled={analyzing}>
              {analyzing ? '...' : '🩺 Анализ'}
            </button>
          </div>

          {/* Parse result toast */}
          {parseResult && (
            <div className={`parse-toast ${parseResult.count === 0 ? 'parse-toast--empty' : ''}`}>
              {parseResult.count === 0
                ? '🤔 Не понял что записать'
                : `✓ Записано в: ${parseResult.modules.join(', ')}`
              }
            </div>
          )}

          {/* Active module or pet card */}
          {activeModule && ActiveComponent ? (
            <div className="module-view">
              <div className="module-view-header" style={{ borderColor: activeModuleData?.color }}>
                <span>{activeModuleData?.icon}</span>
                <span className="font-typewriter">{activeModuleData?.label}</span>
                {activeModuleData?.isPremium && <span className="premium-badge">★ Premium</span>}
              </div>
              <ActiveComponent petId={pet.id} />
            </div>
          ) : (
            <PetCard pet={pet} calcAge={calcAge} onShowVet={handleShowVet} />
          )}

          {/* Vet analysis — below pet card / show-to-vet button */}
          {vetAdvice && (
            <VetAnalysis advice={vetAdvice} />
          )}
        </div>
      </div>

      {DEV_MODE && <DevPanel />}
      <QuestionPrompt questions={questions} onSelect={hint => setInputPrefill(hint)} />
      <InputBar petId={pet.id} activeModule={activeModule} onSend={handleSend} parsing={parsing} devMode={DEV_MODE} pet={pet}
        prefillText={inputPrefill} onPrefillConsumed={() => setInputPrefill('')} />

      {vetCardData && (
        <VetCard pet={pet} calcAge={calcAge} allData={vetCardData} onClose={() => setVetCardData(null)} />
      )}

      {showPaywall && (
        <Paywall
          onClose={() => setShowPaywall(false)}
          onPurchased={() => { setShowPaywall(false); window.location.reload(); }}
        />
      )}

      {showEditForm && (
        <OnboardingForm
          initialPet={pet}
          onComplete={async (updated) => {
            const saved = await updatePet(pet.id, updated);
            onUpdatePet(saved);
            setShowEditForm(false);
            loadQuestions();
          }}
        />
      )}
    </div>
  );
}
