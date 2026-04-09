import { useState } from 'react';
import type { Pet } from '../types';
import { Weight, Calendar, Dna, Stethoscope, Trash2 } from 'lucide-react';

interface PetCardProps {
  pet: Pet;
  calcAge: (birthDate: string) => string;
  onDelete: () => void;
  onShowVet?: () => void;
}

export function PetCard({ pet, calcAge, onDelete, onShowVet }: PetCardProps) {
  const [confirm, setConfirm] = useState(false);

  const speciesLabel = {
    cat: 'Кошка', dog: 'Собака', bird: 'Птица', other: 'Другое',
  }[pet.species];

  return (
    <div className="pet-card">
      {/* Photo */}
      <div className="pet-card-photo-wrap">
        {pet.photo ? (
          <img src={pet.photo} alt={pet.name} className="pet-card-photo" />
        ) : (
          <div className="pet-card-photo-placeholder">
            <span>{pet.species === 'dog' ? '🐕' : pet.species === 'bird' ? '🐦' : '🐈'}</span>
          </div>
        )}
        <div className="pet-card-photo-label font-typewriter">ФОТО</div>
      </div>

      {/* Info */}
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
            <span>{pet.weight > 0 ? `${pet.weight} кг` : '—'}</span>
          </div>
          {pet.gender && (
            <div className="pet-stat">
              <span>{pet.gender === 'male' ? '♂' : '♀'}</span>
              <span>{pet.gender === 'male' ? 'Мальчик' : 'Девочка'}</span>
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

      {/* Buttons */}
      <div className="pet-card-actions">
        <button className="show-vet-btn font-typewriter" onClick={onShowVet}>
          <Stethoscope size={14} />
          Показать врачу
        </button>

        {!confirm ? (
          <button className="delete-pet-btn" onClick={() => setConfirm(true)}>
            <Trash2 size={14} />
          </button>
        ) : (
          <div className="delete-confirm">
            <span>Удалить {pet.name}?</span>
            <button className="delete-confirm-yes" onClick={onDelete}>Да</button>
            <button className="delete-confirm-no" onClick={() => setConfirm(false)}>Нет</button>
          </div>
        )}
      </div>

      {/* Decorative lines */}
      <div className="paper-lines">
        {Array.from({ length: 1 }).map((_, i) => (
          <div key={i} className="paper-line" />
        ))}
      </div>
    </div>
  );
}
