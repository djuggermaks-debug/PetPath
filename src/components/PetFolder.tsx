import { useState } from 'react';
import type { Pet } from '../types';
import { MODULE_REGISTRY } from '../modules/registry';
import { InputBar } from './InputBar';
import { PetCard } from './PetCard';
import { VetAnalysis } from './VetAnalysis';
import { DevPanel } from '../dev/DevPanel';
import { parseUserText, parseImageData } from '../ai/accountant';
import { analyzeWithVetAgent } from '../ai/vetAgent';
import { loadModuleData, saveModuleData, deletePet } from '../storage';
import { devLogger } from '../dev/logger';

const DEV_MODE = new URLSearchParams(window.location.search).has('dev');

interface PetFolderProps {
  pet: Pet;
  onAddPet: () => void;
  allPets: Pet[];
  onSelectPet: (pet: Pet) => void;
  onDeletePet: (petId: string) => void;
}

export function PetFolder({ pet, onAddPet, allPets, onSelectPet, onDeletePet }: PetFolderProps) {
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [parseResult, setParseResult] = useState<{ count: number; modules: string[] } | null>(null);
  const [vetAdvice, setVetAdvice] = useState<Awaited<ReturnType<typeof analyzeWithVetAgent>> | null>(null);

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
      if (atoms.length === 0) {
        setParseResult({ count: 0, modules: [] });
        return;
      }

      // Save each atom to its module
      for (const atom of atoms) {
        const existing = await loadModuleData(pet.id, atom.module);
        const entry = { id: crypto.randomUUID(), ...atom.data };
        await saveModuleData(pet.id, atom.module, [entry, ...existing]);
        devLogger.log('save', `Сохранено в модуль: ${atom.module}`, entry);
      }
      (window as any).__devRefresh?.();

      const modules = [...new Set(atoms.map(a => {
        const mod = MODULE_REGISTRY.find(m => m.id === a.module);
        return mod ? `${mod.icon} ${mod.label}` : a.module;
      }))];
      setParseResult({ count: atoms.length, modules });

      // Refresh active module if it received new data
      if (activeModule && atoms.some(a => a.module === activeModule)) {
        setActiveModule(null);
        setTimeout(() => setActiveModule(activeModule), 50);
      }
    } finally {
      setParsing(false);
    }
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
          {MODULE_REGISTRY.map(mod => (
            <button key={mod.id}
              className={`side-tab ${activeModule === mod.id ? 'side-tab--active' : ''} ${mod.isPremium ? 'side-tab--premium' : ''}`}
              style={{ '--tab-color': mod.color } as React.CSSProperties}
              onClick={() => setActiveModule(prev => prev === mod.id ? null : mod.id)}
              title={mod.label}>
              <span className="side-tab-icon">{mod.icon}</span>
              <span className="side-tab-label">{mod.labelShort}</span>
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="folder-content scrollable">
          <div className="case-header">
            <div className="case-number font-typewriter">{pet.caseNumber}</div>
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
            <PetCard pet={pet} calcAge={calcAge} onDelete={async () => {
              await deletePet(pet.id);
              onDeletePet(pet.id);
            }} />
          )}

          {/* Vet analysis — below pet card / show-to-vet button */}
          {vetAdvice && (
            <VetAnalysis advice={vetAdvice} />
          )}
        </div>
      </div>

      {DEV_MODE && <DevPanel />}
      <InputBar petId={pet.id} activeModule={activeModule} onSend={handleSend} parsing={parsing} devMode={DEV_MODE} pet={pet} />
    </div>
  );
}
