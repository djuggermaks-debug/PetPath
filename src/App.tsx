import { useState, useEffect } from 'react';
import type { Pet } from './types';
import { OnboardingForm } from './components/OnboardingForm';
import { PetFolder } from './components/PetFolder';
import { loadAllPets, savePet } from './storage';

import './styles/global.css';
import './styles/app.css';

function App() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [activePet, setActivePet] = useState<Pet | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load pets from storage on start
  useEffect(() => {
    loadAllPets().then(loaded => {
      setPets(loaded);
      if (loaded.length > 0) setActivePet(loaded[0]);
      setLoading(false);
    });
  }, []);

  const handleAddPet = async (pet: Pet) => {
    await savePet(pet);
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

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="font-typewriter">Загрузка дела...</span>
      </div>
    );
  }

  if (pets.length === 0 && !showOnboarding) {
    return <OnboardingForm onComplete={handleAddPet} />;
  }

  return (
    <>
      {activePet && (
        <PetFolder
          pet={activePet}
          allPets={pets}
          onSelectPet={setActivePet}
          onAddPet={() => setShowOnboarding(true)}
          onDeletePet={handleDeletePet}
          onUpdatePet={handleUpdatePet}
        />
      )}
      {showOnboarding && (
        <OnboardingForm onComplete={handleAddPet} />
      )}
    </>
  );
}

export default App;
