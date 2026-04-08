import { useState } from 'react';
import type { Pet } from '../types';
import { MODULE_REGISTRY } from '../modules/registry';
import { InputBar } from './InputBar';
import { PetCard } from './PetCard';

interface PetFolderProps {
  pet: Pet;
  onAddPet: () => void;
  allPets: Pet[];
  onSelectPet: (pet: Pet) => void;
}

export function PetFolder({ pet, onAddPet, allPets, onSelectPet }: PetFolderProps) {
  const [activeModule, setActiveModule] = useState<string | null>(null);

  const activeModuleData = MODULE_REGISTRY.find(m => m.id === activeModule);
  const ActiveComponent = activeModuleData?.component;

  const calcAge = (birthDate: string) => {
    if (!birthDate) return '—';
    const birth = new Date(birthDate);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (months < 12) return `${months} мес.`;
    const years = Math.floor(months / 12);
    return `${years} л.`;
  };

  return (
    <div className="folder-container">
      {/* Top pet tabs */}
      <div className="pet-tabs-bar">
        {allPets.map(p => (
          <button
            key={p.id}
            className={`pet-tab ${p.id === pet.id ? 'pet-tab--active' : ''}`}
            onClick={() => onSelectPet(p)}
          >
            {p.photo ? (
              <img src={p.photo} alt={p.name} className="pet-tab-photo" />
            ) : (
              <span className="pet-tab-emoji">{p.species === 'dog' ? '🐕' : p.species === 'bird' ? '🐦' : '🐈'}</span>
            )}
            <span className="pet-tab-name">{p.name}</span>
          </button>
        ))}
        <button className="pet-tab pet-tab--add" onClick={onAddPet}>
          <span>+</span>
        </button>
      </div>

      {/* Folder body */}
      <div className="folder-body">
        {/* Side tabs */}
        <div className="side-tabs">
          {MODULE_REGISTRY.map(mod => (
            <button
              key={mod.id}
              className={`side-tab ${activeModule === mod.id ? 'side-tab--active' : ''} ${mod.isPremium ? 'side-tab--premium' : ''}`}
              style={{ '--tab-color': mod.color } as React.CSSProperties}
              onClick={() => setActiveModule(prev => prev === mod.id ? null : mod.id)}
              title={mod.label}
            >
              <span className="side-tab-icon">{mod.icon}</span>
              <span className="side-tab-label">{mod.labelShort}</span>
            </button>
          ))}
        </div>

        {/* Main content area */}
        <div className="folder-content scrollable">
          {/* Case header */}
          <div className="case-header">
            <div className="case-number font-typewriter">
              {pet.caseNumber}
            </div>
            <div className="case-stamp font-typewriter">АКТИВНОЕ</div>
          </div>

          {/* Active module or pet card */}
          {activeModule && ActiveComponent ? (
            <div className="module-view">
              <div className="module-view-header" style={{ borderColor: activeModuleData?.color }}>
                <span>{activeModuleData?.icon}</span>
                <span className="font-typewriter">{activeModuleData?.label}</span>
                {activeModuleData?.isPremium && (
                  <span className="premium-badge">★ Premium</span>
                )}
              </div>
              <ActiveComponent petId={pet.id} />
            </div>
          ) : (
            <PetCard pet={pet} calcAge={calcAge} />
          )}
        </div>
      </div>

      {/* Bottom input */}
      <InputBar petId={pet.id} activeModule={activeModule} />
    </div>
  );
}
