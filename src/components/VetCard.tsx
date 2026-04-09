import { X, Share2, Check } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Pet } from '../types';

interface VetCardProps {
  pet: Pet;
  calcAge: (birthDate: string) => string;
  allData: Record<string, unknown[]>;
  onClose: () => void;
}

function formatDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function buildShareText(pet: Pet, calcAge: (b: string) => string, allData: Record<string, unknown[]>): string {
  const lines: string[] = [];
  lines.push(`🐾 КАРТОЧКА ПИТОМЦА ДЛЯ ВРАЧА`);
  lines.push('');
  lines.push(`Кличка: ${pet.name}`);
  lines.push(`Вид: ${{ cat: 'Кошка', dog: 'Собака', bird: 'Птица', other: 'Другое' }[pet.species]}`);
  if (pet.breed) lines.push(`Порода: ${pet.breed}`);
  lines.push(`Возраст: ${calcAge(pet.birthDate)}`);
  if (pet.weight > 0) lines.push(`Вес: ${pet.weight} кг`);
  if (pet.gender) lines.push(`Пол: ${pet.gender === 'male' ? 'Мальчик' : 'Девочка'}`);
  if (pet.color) lines.push(`Окрас: ${pet.color}`);

  const health = (allData.health || []) as any[];
  if (health.length > 0) {
    lines.push('');
    lines.push('── ЗДОРОВЬЕ ──');
    health.slice(0, 10).forEach((e: any) => {
      const type = { symptom: 'Симптом', visit: 'Визит', diagnosis: 'Диагноз' }[e.type as string] || e.type;
      lines.push(`• ${type}: ${e.description || e.result || ''}${e.severity ? ` (${e.severity})` : ''}${e.date ? ' — ' + formatDate(e.date) : ''}`);
    });
  }

  const allergies = (allData.allergies || []) as any[];
  if (allergies.length > 0) {
    lines.push('');
    lines.push('── АЛЛЕРГИИ ──');
    allergies.forEach((e: any) => {
      lines.push(`• ${e.allergen} (${e.allergenType}) — ${e.reaction}${e.confirmedByVet ? ' ✓ подтверждено' : ''}`);
    });
  }

  const meds = (allData.medications || []) as any[];
  const activeMeds = meds.filter((e: any) => !e.endDate || new Date(e.endDate) >= new Date());
  if (activeMeds.length > 0) {
    lines.push('');
    lines.push('── ЛЕКАРСТВА ──');
    activeMeds.forEach((e: any) => {
      lines.push(`• ${e.name}${e.dose ? ' ' + e.dose + (e.unit || '') : ''}${e.frequency ? ' — ' + e.frequency : ''}${e.reason ? ' (' + e.reason + ')' : ''}`);
    });
  }

  const vaccines = (allData.vaccines || []) as any[];
  if (vaccines.length > 0) {
    lines.push('');
    lines.push('── ПРИВИВКИ ──');
    vaccines.slice(0, 5).forEach((e: any) => {
      lines.push(`• ${e.name}${e.date ? ' — ' + formatDate(e.date) : ''}${e.nextDate ? ' / следующая: ' + formatDate(e.nextDate) : ''}`);
    });
  }

  lines.push('');
  lines.push('Создано в PetPath');
  return lines.join('\n');
}

export function VetCard({ pet, calcAge, allData, onClose }: VetCardProps) {
  const [copied, setCopied] = useState(false);

  const health = (allData.health || []) as any[];
  const allergies = (allData.allergies || []) as any[];
  const meds = (allData.medications || []) as any[];
  const activeMeds = meds.filter((e: any) => !e.endDate || new Date(e.endDate) >= new Date());
  const vaccines = (allData.vaccines || []) as any[];

  const shareText = buildShareText(pet, calcAge, allData);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Карточка ${pet.name}`, text: shareText });
        return;
      } catch { /* fallback */ }
    }
    // fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const speciesLabel = { cat: 'Кошка', dog: 'Собака', bird: 'Птица', other: 'Другое' }[pet.species];

  return createPortal(
    <div className="vetcard-overlay" onClick={onClose}>
      <div className="vetcard" onClick={e => e.stopPropagation()}>
        <div className="vetcard-header">
          <span className="font-typewriter">🩺 Карточка для врача</span>
          <button className="vetcard-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="vetcard-body">
          {/* Pet info */}
          <div className="vetcard-section vetcard-section--pet">
            {pet.photo && <img src={pet.photo} alt={pet.name} className="vetcard-photo" />}
            <div>
              <p className="vetcard-petname font-typewriter">{pet.name}</p>
              <p className="vetcard-petinfo">{pet.breed || speciesLabel} · {calcAge(pet.birthDate)}{pet.weight > 0 ? ` · ${pet.weight} кг` : ''}</p>
              {pet.gender && <p className="vetcard-petinfo">{pet.gender === 'male' ? '♂ Мальчик' : '♀ Девочка'}{pet.color ? ` · ${pet.color}` : ''}</p>}
            </div>
          </div>

          {/* Health */}
          {health.length > 0 && (
            <div className="vetcard-section">
              <p className="vetcard-section-title">🏥 Здоровье</p>
              {health.slice(0, 10).map((e: any) => (
                <div key={e.id} className="vetcard-item">
                  <span className="vetcard-item-badge">{{ symptom: 'Симптом', visit: 'Визит', diagnosis: 'Диагноз' }[e.type as string]}</span>
                  <span>{e.description || e.result || ''}</span>
                  {e.date && <span className="vetcard-item-date">{formatDate(e.date)}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Allergies */}
          {allergies.length > 0 && (
            <div className="vetcard-section">
              <p className="vetcard-section-title">⚠️ Аллергии</p>
              {allergies.map((e: any) => (
                <div key={e.id} className="vetcard-item">
                  <span className="vetcard-item-badge">{e.allergenType}</span>
                  <span>{e.allergen} — {e.reaction}</span>
                  {e.confirmedByVet && <span className="vetcard-item-confirmed">✓</span>}
                </div>
              ))}
            </div>
          )}

          {/* Medications */}
          {activeMeds.length > 0 && (
            <div className="vetcard-section">
              <p className="vetcard-section-title">💊 Лекарства</p>
              {activeMeds.map((e: any) => (
                <div key={e.id} className="vetcard-item">
                  <span className="vetcard-item-bold">{e.name}</span>
                  {e.dose && <span> {e.dose}{e.unit}</span>}
                  {e.frequency && <span className="vetcard-item-date"> · {e.frequency}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Vaccines */}
          {vaccines.length > 0 && (
            <div className="vetcard-section">
              <p className="vetcard-section-title">💉 Прививки</p>
              {vaccines.slice(0, 5).map((e: any) => (
                <div key={e.id} className="vetcard-item">
                  <span className="vetcard-item-bold">{e.name}</span>
                  {e.date && <span className="vetcard-item-date"> · {formatDate(e.date)}</span>}
                  {e.nextDate && <span className="vetcard-item-date"> / след: {formatDate(e.nextDate)}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="vetcard-footer">
          <button className="vetcard-share-btn font-typewriter" onClick={handleShare}>
            {copied ? <><Check size={14} /> Скопировано!</> : <><Share2 size={14} /> Поделиться</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
