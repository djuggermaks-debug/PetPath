import { useState } from 'react';
import type { Pet } from './types';
import { OnboardingForm } from './components/OnboardingForm';
import { PetFolder } from './components/PetFolder';
import './styles/global.css';
import './styles/app.css';

function App() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [activePet, setActivePet] = useState<Pet | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleAddPet = (pet: Pet) => {
    setPets(prev => [...prev, pet]);
    setActivePet(pet);
    setShowOnboarding(false);
  };

  // No pets yet — show onboarding immediately
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
        />
      )}
      {showOnboarding && (
        <OnboardingForm onComplete={handleAddPet} />
      )}
    </>
  );
}

export default App;
