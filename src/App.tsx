import { useState, useEffect } from 'react';
import type { Pet } from './types';
import { OnboardingForm } from './components/OnboardingForm';
import { PawLoader } from './components/PawLoader';
import { PetFolder } from './components/PetFolder';
import { WelcomeScreen } from './components/WelcomeScreen';
import { loadAllPets, savePet } from './storage';
import { useUserStatus } from './hooks/useUserStatus';

import './styles/global.css';
import './styles/app.css';

function App() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [activePet, setActivePet] = useState<Pet | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
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
      setPets(loaded);
      if (loaded.length > 0) setActivePet(loaded[0]);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  const handleAddPet = async (pet: Pet) => {
    try {
      await savePet(pet);
    } catch (e) {
      console.error('savePet error:', e);
      try {
        await savePet({ ...pet, photo: undefined });
      } catch (e2) {
        console.error('savePet without photo error:', e2);
        alert('Ошибка сохранения: ' + String(e2));
        return;
      }
    }
    setPets(prev => [...prev, pet]);
    setActivePet(pet);
    setShowOnboarding(false);
  };

  const handleDeletePet = (petId: string) => {
    const updated = pets.filter(p => p.id !== petId);
    setPets(updated);
    if (updated.length > 0) setActivePet(updated[0]);
    else setActivePet(null);
  };

  const handleUpdatePet = (updated: Pet) => {
    setPets(prev => prev.map(p => p.id === updated.id ? updated : p));
    setActivePet(updated);
  };

  if (loading || userStatus.status === 'loading') {
    return (
      <div className="loading-screen">
        <PawLoader text="Загрузка дела..." />
      </div>
    );
  }

  return (
    <>
      {showWelcome && (
        <WelcomeScreen
          isFirstLaunch={isFirstLaunch}
          onStart={() => {
            setShowWelcome(false);
            if (pets.length === 0) setShowOnboarding(true);
          }}
          onClose={() => setShowWelcome(false)}
        />
      )}

      {!showWelcome && pets.length === 0 && !showOnboarding && (
        <OnboardingForm onComplete={handleAddPet} />
      )}

      {activePet && (
        <PetFolder
          pet={activePet}
          allPets={pets}
          onSelectPet={setActivePet}
          onAddPet={() => setShowOnboarding(true)}
          onDeletePet={handleDeletePet}
          onUpdatePet={handleUpdatePet}
          onShowHelp={() => { setIsFirstLaunch(false); setShowWelcome(true); }}
          userStatus={userStatus}
        />
      )}

      {showOnboarding && (
        <OnboardingForm onComplete={handleAddPet} onCancel={pets.length > 0 ? () => setShowOnboarding(false) : undefined} />
      )}
    </>
  );
}

export default App;
