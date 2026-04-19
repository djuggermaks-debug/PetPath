import { useState, useEffect } from 'react';
import type { Pet } from './types';
import { PawLoader } from './components/PawLoader';
import { PetFolder } from './components/PetFolder';
import { WelcomeScreen } from './components/WelcomeScreen';
import { loadAllPets, savePet } from './storage';
import { useUserStatus } from './hooks/useUserStatus';
import { useTranslation } from 'react-i18next';

import './styles/global.css';
import './styles/app.css';

function createEmptyPet(): Pet {
  return {
    id: crypto.randomUUID(),
    name: '',
    species: 'cat',
    breed: '',
    birthDate: '',
    weight: 0,
    weightUnit: 'kg',
    gender: 'male',
    color: '',
    caseNumber: `ДЕЛ-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    createdAt: new Date().toISOString(),
  };
}

function App() {
  const { t } = useTranslation();
  const [pets, setPets] = useState<Pet[]>([]);
  const [activePet, setActivePet] = useState<Pet | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [loading, setLoading] = useState(true);

  const userStatus = useUserStatus();

  useEffect(() => {
    const welcomed = localStorage.getItem('_welcomed');
    if (!welcomed) {
      setIsFirstLaunch(true);
      setShowWelcome(true);
      localStorage.setItem('_welcomed', '1');
    }
    loadAllPets().then(loaded => {
      if (loaded.length > 0) {
        setPets(loaded);
        setActivePet(loaded[0]);
      } else if (welcomed) {
        const empty = createEmptyPet();
        setPets([empty]);
        setActivePet(empty);
        savePet(empty).catch(console.error);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const addEmptyPet = () => {
    const empty = createEmptyPet();
    setPets(prev => [...prev, empty]);
    setActivePet(empty);
    savePet(empty).catch(console.error);
  };

  const handleWelcomeStart = () => {
    setShowWelcome(false);
    if (pets.length === 0) addEmptyPet();
  };

  const handleDeletePet = (petId: string) => {
    const updated = pets.filter(p => p.id !== petId);
    setPets(updated);
    if (updated.length > 0) setActivePet(updated[0]);
    else addEmptyPet();
  };

  const handleUpdatePet = (updated: Pet) => {
    setPets(prev => prev.map(p => p.id === updated.id ? updated : p));
    setActivePet(updated);
  };

  if (loading || userStatus.status === 'loading') {
    return (
      <div className="loading-screen">
        <PawLoader text={t('folder.appLoading')} />
      </div>
    );
  }

  return (
    <>
      {showWelcome && (
        <WelcomeScreen
          isFirstLaunch={isFirstLaunch}
          onStart={handleWelcomeStart}
          onClose={() => setShowWelcome(false)}
        />
      )}

      {activePet && (
        <PetFolder
          pet={activePet}
          allPets={pets}
          onSelectPet={setActivePet}
          onAddPet={addEmptyPet}
          onDeletePet={handleDeletePet}
          onUpdatePet={handleUpdatePet}
          onShowHelp={() => { setIsFirstLaunch(false); setShowWelcome(true); }}
          userStatus={userStatus}
        />
      )}
    </>
  );
}

export default App;
