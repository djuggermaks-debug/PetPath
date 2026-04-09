import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import type { AllergyEntry } from '../../types/modules';
import { loadModuleData, saveModuleData } from '../../storage';
import { EmptyState, RecordCard, severityLabel, severityColor } from '../../components/ModuleShared';
import { FormSheet, Field, Input, Select, Toggle } from '../../components/FormSheet';

const empty = (): Omit<AllergyEntry, 'id'> => ({
  allergen: '', allergenType: 'food', reaction: '',
  severity: 'mild', firstDate: '', confirmedByVet: false,
});

export function AllergiesModule({ petId }: { petId: string }) {
  const [entries, setEntries] = useState<AllergyEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty());

  useEffect(() => { loadModuleData<AllergyEntry>(petId, 'allergies').then(setEntries); }, [petId]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.allergen.trim()) return;
    const entry: AllergyEntry = { id: crypto.randomUUID(), ...form };
    const updated = [entry, ...entries];
    setEntries(updated);
    await saveModuleData(petId, 'allergies', updated);
    setForm(empty());
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    await saveModuleData(petId, 'allergies', updated);
  };

  const typeLabel: Record<string, string> = { food: 'Еда', plant: 'Растение', drug: 'Препарат', other: 'Другое' };

  return (
    <>
      <button className="module-add-btn" onClick={() => setShowForm(true)}>
        <Plus size={14} /> Добавить аллергию
      </button>

      {entries.length === 0 ? <EmptyState label="Аллергии" /> : (
        <div className="module-list">
          {entries.map(e => (
            <RecordCard key={e.id} date={e.firstDate}
              badge={severityLabel(e.severity)} badgeColor={severityColor(e.severity)}
              title={`${e.allergen} (${typeLabel[e.allergenType]})`}
              photo={e._photo}
              fields={[
                { label: 'Реакция', value: e.reaction },
                { label: 'Подтверждено врачом', value: e.confirmedByVet ? 'Да' : 'Нет' },
              ]}
              onDelete={() => handleDelete(e.id)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <FormSheet title="Добавить аллергию" onClose={() => setShowForm(false)} onSave={handleSave}>
          <Field label="Аллерген *"><Input placeholder="Например: курица, пыльца берёзы" value={form.allergen} onChange={set('allergen')} /></Field>
          <Field label="Тип аллергена">
            <Select value={form.allergenType} onChange={set('allergenType')}>
              <option value="food">Еда</option>
              <option value="plant">Растение</option>
              <option value="drug">Препарат</option>
              <option value="other">Другое</option>
            </Select>
          </Field>
          <Field label="Реакция"><Input placeholder="Как проявляется" value={form.reaction} onChange={set('reaction')} /></Field>
          <Field label="Степень тяжести">
            <Select value={form.severity} onChange={set('severity')}>
              <option value="mild">Лёгкая</option>
              <option value="moderate">Средняя</option>
              <option value="severe">Тяжёлая</option>
            </Select>
          </Field>
          <Field label="Дата первого выявления"><Input type="date" value={form.firstDate} onChange={set('firstDate')} /></Field>
          <Toggle label="Подтверждено ветеринаром" checked={form.confirmedByVet}
            onChange={v => setForm(p => ({ ...p, confirmedByVet: v }))} />
        </FormSheet>
      )}
    </>
  );
}
