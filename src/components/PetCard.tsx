import type { Pet } from '../types';
import { Weight, Calendar, Dna, Stethoscope } from 'lucide-react';
import { PetCalendar } from './PetCalendar';
import { useTranslation } from 'react-i18next';

interface PetCardProps {
  pet: Pet;
  calcAge: (birthDate: string) => string;
  onShowVet?: () => void;
}

export function PetCard({ pet, calcAge, onShowVet }: PetCardProps) {
  const { t } = useTranslation();

  const speciesLabel = {
    cat: t('pet.species.cat'),
    dog: t('pet.species.dog'),
    bird: t('pet.species.bird'),
    other: t('pet.species.other'),
  }[pet.species];

  return (
    <div className="pet-card">
      <div className="pet-card-photo-wrap">
        {pet.photo ? (
          <img src={pet.photo} alt={pet.name} className="pet-card-photo" />
        ) : (
          <div className="pet-card-photo-placeholder">
            <span>{pet.species === 'dog' ? '🐕' : pet.species === 'bird' ? '🐦' : '🐈'}</span>
          </div>
        )}
        <div className="pet-card-photo-label font-typewriter">{t('pet.photo')}</div>
      </div>

      <div className="pet-card-info">
        <h1 className="pet-name font-typewriter">{pet.name}</h1>
        <p className="pet-breed">{pet.breed || speciesLabel}</p>

        <div className="pet-stats">
          <div className="pet-stat">
            <Calendar size={13} />
            <span>{calcAge(pet.birthDate)}</span>
          </div>
          <div className="pet-stat">
            <Weight size={13} />
            <span>{pet.weight > 0 ? `${pet.weight} ${t('pet.kg')}` : '—'}</span>
          </div>
          {pet.gender && (
            <div className="pet-stat">
              <span>{pet.gender === 'male' ? '♂' : '♀'}</span>
              <span>{pet.gender === 'male' ? t('pet.gender.male') : t('pet.gender.female')}</span>
            </div>
          )}
        </div>

        {pet.color && (
          <div className="pet-color">
            <Dna size={12} />
            <span>{pet.color}</span>
          </div>
        )}
      </div>

      <div className="pet-card-actions">
        <button className="show-vet-btn font-typewriter" onClick={onShowVet}>
          <Stethoscope size={14} />
          {t('vetCard.title')}
        </button>
      </div>

      <PetCalendar petId={pet.id} />

      <div className="paper-lines">
        {Array.from({ length: 1 }).map((_, i) => (
          <div key={i} className="paper-line" />
        ))}
      </div>
    </div>
  );
}
