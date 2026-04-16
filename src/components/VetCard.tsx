import { X, Share2, Check } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Pet } from '../types';
import { useTranslation } from 'react-i18next';
import { formatDate } from './ModuleShared';

interface VetCardProps {
  pet: Pet;
  calcAge: (birthDate: string) => string;
  allData: Record<string, unknown[]>;
  onClose: () => void;
}

function buildShareText(
  pet: Pet,
  calcAge: (b: string) => string,
  allData: Record<string, unknown[]>,
  t: (key: string) => string,
): string {
  const lines: string[] = [];
  lines.push(t('vetCard.shareHeader'));
  lines.push('');

  const speciesLabel = {
    cat: t('pet.species.cat'), dog: t('pet.species.dog'),
    bird: t('pet.species.bird'), other: t('pet.species.other'),
  }[pet.species];

  lines.push(`${t('vetCard.shareLabels.name')}: ${pet.name}`);
  lines.push(`${t('vetCard.shareLabels.species')}: ${speciesLabel}`);
  if (pet.breed) lines.push(`${t('vetCard.shareLabels.breed')}: ${pet.breed}`);
  lines.push(`${t('vetCard.shareLabels.age')}: ${calcAge(pet.birthDate)}`);
  if (pet.weight > 0) lines.push(`${t('vetCard.shareLabels.weight')}: ${pet.weight} ${t('pet.kg')}`);
  if (pet.gender) lines.push(`${t('vetCard.shareLabels.gender')}: ${pet.gender === 'male' ? t('pet.gender.male') : t('pet.gender.female')}`);
  if (pet.color) lines.push(`${t('vetCard.shareLabels.color')}: ${pet.color}`);

  const health = (allData.health || []) as any[];
  if (health.length > 0) {
    lines.push('');
    lines.push(t('vetCard.shareSections.health'));
    health.slice(0, 10).forEach((e: any) => {
      const type = {
        symptom: t('vetCard.healthTypes.symptom'),
        visit: t('vetCard.healthTypes.visit'),
        diagnosis: t('vetCard.healthTypes.diagnosis'),
      }[e.type as string] || e.type;
      lines.push(`• ${type}: ${e.description || e.result || ''}${e.severity ? ` (${e.severity})` : ''}${e.date ? ' — ' + formatDate(e.date) : ''}`);
    });
  }

  const allergies = (allData.allergies || []) as any[];
  if (allergies.length > 0) {
    lines.push('');
    lines.push(t('vetCard.shareSections.allergies'));
    allergies.forEach((e: any) => {
      lines.push(`• ${e.allergen} (${e.allergenType}) — ${e.reaction}${e.confirmedByVet ? ' ' + t('vetCard.confirmedByVet') : ''}`);
    });
  }

  const meds = (allData.medications || []) as any[];
  const activeMeds = meds.filter((e: any) => !e.endDate || new Date(e.endDate) >= new Date());
  if (activeMeds.length > 0) {
    lines.push('');
    lines.push(t('vetCard.shareSections.medications'));
    activeMeds.forEach((e: any) => {
      lines.push(`• ${e.name}${e.dose ? ' ' + e.dose + (e.unit || '') : ''}${e.frequency ? ' — ' + e.frequency : ''}${e.reason ? ' (' + e.reason + ')' : ''}`);
    });
  }

  const vaccines = (allData.vaccines || []) as any[];
  if (vaccines.length > 0) {
    lines.push('');
    lines.push(t('vetCard.shareSections.vaccines'));
    vaccines.slice(0, 5).forEach((e: any) => {
      lines.push(`• ${e.name}${e.date ? ' — ' + formatDate(e.date) : ''}${e.nextDate ? ' / ' + t('vetCard.nextDate') + formatDate(e.nextDate) : ''}`);
    });
  }

  lines.push('');
  lines.push(t('vetCard.footer'));
  return lines.join('\n');
}

export function VetCard({ pet, calcAge, allData, onClose }: VetCardProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const health = (allData.health || []) as any[];
  const allergies = (allData.allergies || []) as any[];
  const meds = (allData.medications || []) as any[];
  const activeMeds = meds.filter((e: any) => !e.endDate || new Date(e.endDate) >= new Date());
  const vaccines = (allData.vaccines || []) as any[];

  const shareText = buildShareText(pet, calcAge, allData, t);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: t('vetCard.shareTitle', { name: pet.name }), text: shareText });
        return;
      } catch { /* fallback */ }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const speciesLabel = {
    cat: t('pet.species.cat'), dog: t('pet.species.dog'),
    bird: t('pet.species.bird'), other: t('pet.species.other'),
  }[pet.species];

  return createPortal(
    <div className="vetcard-overlay" onClick={onClose}>
      <div className="vetcard" onClick={e => e.stopPropagation()}>
        <div className="vetcard-header">
          <span className="font-typewriter">{t('vetCard.title')}</span>
          <button className="vetcard-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="vetcard-body">
          <div className="vetcard-section vetcard-section--pet">
            {pet.photo && <img src={pet.photo} alt={pet.name} className="vetcard-photo" />}
            <div>
              <p className="vetcard-petname font-typewriter">{pet.name}</p>
              <p className="vetcard-petinfo">{pet.breed || speciesLabel} · {calcAge(pet.birthDate)}{pet.weight > 0 ? ` · ${pet.weight} ${t('pet.kg')}` : ''}</p>
              {pet.gender && <p className="vetcard-petinfo">{pet.gender === 'male' ? t('pet.gender.maleSym') : t('pet.gender.femaleSym')}{pet.color ? ` · ${pet.color}` : ''}</p>}
            </div>
          </div>

          {health.length > 0 && (
            <div className="vetcard-section">
              <p className="vetcard-section-title">{t('vetCard.sectionHealth')}</p>
              {health.slice(0, 10).map((e: any) => (
                <div key={e.id} className="vetcard-item">
                  <span className="vetcard-item-badge">
                    {{ symptom: t('vetCard.healthTypes.symptom'), visit: t('vetCard.healthTypes.visit'), diagnosis: t('vetCard.healthTypes.diagnosis') }[e.type as string]}
                  </span>
                  <span>{e.description || e.result || ''}</span>
                  {e.date && <span className="vetcard-item-date">{formatDate(e.date)}</span>}
                </div>
              ))}
            </div>
          )}

          {allergies.length > 0 && (
            <div className="vetcard-section">
              <p className="vetcard-section-title">{t('vetCard.sectionAllergies')}</p>
              {allergies.map((e: any) => (
                <div key={e.id} className="vetcard-item">
                  <span className="vetcard-item-badge">{e.allergenType}</span>
                  <span>{e.allergen} — {e.reaction}</span>
                  {e.confirmedByVet && <span className="vetcard-item-confirmed">✓</span>}
                </div>
              ))}
            </div>
          )}

          {activeMeds.length > 0 && (
            <div className="vetcard-section">
              <p className="vetcard-section-title">{t('vetCard.sectionMeds')}</p>
              {activeMeds.map((e: any) => (
                <div key={e.id} className="vetcard-item">
                  <span className="vetcard-item-bold">{e.name}</span>
                  {e.dose && <span> {e.dose}{e.unit}</span>}
                  {e.frequency && <span className="vetcard-item-date"> · {e.frequency}</span>}
                </div>
              ))}
            </div>
          )}

          {vaccines.length > 0 && (
            <div className="vetcard-section">
              <p className="vetcard-section-title">{t('vetCard.sectionVaccines')}</p>
              {vaccines.slice(0, 5).map((e: any) => (
                <div key={e.id} className="vetcard-item">
                  <span className="vetcard-item-bold">{e.name}</span>
                  {e.date && <span className="vetcard-item-date"> · {formatDate(e.date)}</span>}
                  {e.nextDate && <span className="vetcard-item-date"> / {t('vetCard.nextVaccine')}{formatDate(e.nextDate)}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="vetcard-footer">
          <button className="vetcard-share-btn font-typewriter" onClick={handleShare}>
            {copied ? <><Check size={14} /> {t('vetCard.shareBtnCopy')}</> : <><Share2 size={14} /> {t('vetCard.shareBtnShare')}</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
