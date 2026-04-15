import { useState, useRef } from 'react';
import type { Pet } from '../types';
import { Camera, ChevronDown } from 'lucide-react';
import { detectPetBreed } from '../ai/breedDetector';
import { PawLoader } from './PawLoader';

interface OnboardingFormProps {
  onComplete: (pet: Pet) => void;
  initialPet?: Pet;
  onCancel?: () => void;
}

export function OnboardingForm({ onComplete, initialPet, onCancel }: OnboardingFormProps) {
  const isEditing = !!initialPet;

  const [photo, setPhoto] = useState<string | null>(initialPet?.photo ?? null);
  const [detectingBreed, setDetectingBreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: initialPet?.name ?? '',
    species: (initialPet?.species ?? 'cat') as Pet['species'],
    breed: initialPet?.breed ?? '',
    birthDate: initialPet?.birthDate ?? '',
    weight: initialPet?.weight ? String(initialPet.weight) : '',
    gender: (initialPet?.gender ?? 'male') as Pet['gender'],
    color: initialPet?.color ?? '',
  });

  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setPhoto(dataUrl);
      // Auto-detect breed
      const base64 = dataUrl.split(',')[1];
      const mimeType = dataUrl.split(':')[1].split(';')[0];
      setDetectingBreed(true);
      try {
        const info = await detectPetBreed(base64, mimeType, form.species);
        if (info.breed) setForm(prev => ({ ...prev, breed: info.breed }));
        if (info.color) setForm(prev => ({ ...prev, color: info.color }));
      } finally {
        setDetectingBreed(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    const pet: Pet = {
      id: initialPet?.id ?? crypto.randomUUID(),
      ...form,
      weight: parseFloat(form.weight) || 0,
      weightUnit: 'kg',
      photo: photo || undefined,
      caseNumber: initialPet?.caseNumber ?? `ДЕЛ-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      createdAt: initialPet?.createdAt ?? new Date().toISOString(),
    };
    onComplete(pet);
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="onboarding-header font-typewriter">
          <span className="stamp">{isEditing ? 'РЕДАКТИРОВАТЬ' : 'НОВОЕ ДЕЛО'}</span>
          <h2>{isEditing ? 'Изменить профиль' : 'Добавить питомца'}</h2>
          {onCancel && (
            <button className="onboarding-cancel" onClick={onCancel}>✕</button>
          )}
        </div>

        {/* Photo upload */}
        <div className="photo-upload" onClick={() => fileRef.current?.click()}>
          {photo ? (
            <img src={photo} alt="Pet" className="photo-preview" />
          ) : (
            <div className="photo-placeholder">
              <Camera size={32} strokeWidth={1.5} />
              <span>Фото питомца</span>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} hidden />
        </div>

        {/* Form fields */}
        <div className="form-fields">
          <div className="field-group">
            <label className="field-label font-typewriter">Кличка *</label>
            <input className="field-input" placeholder="Барсик" value={form.name} onChange={set('name')} />
          </div>

          <div className="field-row">
            <div className="field-group">
              <label className="field-label font-typewriter">Вид</label>
              <div className="select-wrapper">
                <select className="field-input" value={form.species} onChange={set('species')}>
                  <option value="cat">Кот / Кошка</option>
                  <option value="dog">Собака</option>
                  <option value="bird">Птица</option>
                  <option value="other">Другое</option>
                </select>
                <ChevronDown size={14} className="select-icon" />
              </div>
            </div>

            <div className="field-group">
              <label className="field-label font-typewriter">Пол</label>
              <div className="select-wrapper">
                <select className="field-input" value={form.gender} onChange={set('gender')}>
                  <option value="male">Мальчик</option>
                  <option value="female">Девочка</option>
                </select>
                <ChevronDown size={14} className="select-icon" />
              </div>
            </div>
          </div>

          <div className="field-group">
            <label className="field-label font-typewriter">Порода</label>
            <input
              className="field-input"
              placeholder={detectingBreed ? 'Определяю...' : 'Мейн-кун'}
              value={form.breed}
              onChange={set('breed')}
              disabled={detectingBreed}
            />
          </div>

          <div className="field-row">
            <div className="field-group">
              <label className="field-label font-typewriter">Дата рождения</label>
              <input className="field-input" type="date" value={form.birthDate} onChange={set('birthDate')} />
            </div>

            <div className="field-group">
              <label className="field-label font-typewriter">Вес (кг)</label>
              <input
                className="field-input"
                type="number"
                placeholder="4.5"
                step="0.1"
                value={form.weight}
                onChange={set('weight')}
              />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label font-typewriter">Окрас / описание</label>
            <input className="field-input" placeholder="Рыжий, пушистый" value={form.color} onChange={set('color')} />
          </div>
        </div>

        <button
          className="submit-btn font-typewriter"
          onClick={handleSubmit}
          disabled={!form.name.trim() || saving}
        >
          {saving ? 'Сохранение...' : isEditing ? 'Сохранить изменения' : 'Завести дело'}
        </button>
      {(detectingBreed || saving) && (
        <PawLoader overlay text={detectingBreed ? 'Определяю породу...' : 'Сохранение...'} />
      )}
      </div>
    </div>
  );
}
