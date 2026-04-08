import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import type { NutritionEntry } from '../../types/modules';
import { loadModuleData, saveModuleData } from '../../storage';
import { EmptyState, RecordCard } from '../../components/ModuleShared';
import { FormSheet, Field, Input, Select } from '../../components/FormSheet';

const empty = (): Omit<NutritionEntry, 'id'> => ({
  date: new Date().toISOString().slice(0, 10),
  feedType: 'dry', brand: '', portionSize: '',
  frequency: '', restrictions: '', favorites: '', dislikes: '', reaction: '',
});

const feedTypeLabel: Record<string, string> = { dry: 'Сухой', wet: 'Влажный', natural: 'Натуральный', mixed: 'Смешанный' };

export function NutritionModule({ petId }: { petId: string }) {
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty());

  useEffect(() => { loadModuleData<NutritionEntry>(petId, 'nutrition').then(setEntries); }, [petId]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    const entry: NutritionEntry = { id: crypto.randomUUID(), ...form };
    const updated = [entry, ...entries];
    setEntries(updated);
    await saveModuleData(petId, 'nutrition', updated);
    setForm(empty());
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    await saveModuleData(petId, 'nutrition', updated);
  };

  return (
    <>
      <button className="module-add-btn" onClick={() => setShowForm(true)}>
        <Plus size={14} /> Добавить запись
      </button>

      {entries.length === 0 ? <EmptyState label="Питание" /> : (
        <div className="module-list">
          {entries.map(e => (
            <RecordCard key={e.id} date={e.date}
              badge={feedTypeLabel[e.feedType]} badgeColor="#27ae60"
              title={e.brand || feedTypeLabel[e.feedType]}
              fields={[
                { label: 'Порция', value: e.portionSize },
                { label: 'Частота', value: e.frequency },
                { label: 'Ограничения', value: e.restrictions },
                { label: 'Любит', value: e.favorites },
                { label: 'Не ест', value: e.dislikes },
                { label: 'Реакция', value: e.reaction },
              ]}
              onDelete={() => handleDelete(e.id)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <FormSheet title="Добавить питание" onClose={() => setShowForm(false)} onSave={handleSave}>
          <Field label="Тип корма">
            <Select value={form.feedType} onChange={set('feedType')}>
              <option value="dry">Сухой</option>
              <option value="wet">Влажный</option>
              <option value="natural">Натуральный</option>
              <option value="mixed">Смешанный</option>
            </Select>
          </Field>
          <Field label="Бренд / название"><Input placeholder="Royal Canin, Brit, др." value={form.brand} onChange={set('brand')} /></Field>
          <Field label="Размер порции"><Input placeholder="100г / 2 столовых ложки" value={form.portionSize} onChange={set('portionSize')} /></Field>
          <Field label="Частота кормления"><Input placeholder="2 раза в день" value={form.frequency} onChange={set('frequency')} /></Field>
          <Field label="Пищевые ограничения / диета"><Input placeholder="Без курицы, гипоаллергенная..." value={form.restrictions} onChange={set('restrictions')} /></Field>
          <Field label="Любимые продукты"><Input placeholder="Что ест с удовольствием" value={form.favorites} onChange={set('favorites')} /></Field>
          <Field label="Нелюбимые продукты"><Input placeholder="От чего отказывается" value={form.dislikes} onChange={set('dislikes')} /></Field>
          <Field label="Реакция на корм"><Input placeholder="Хорошо переносит / аллергия / расстройство" value={form.reaction} onChange={set('reaction')} /></Field>
        </FormSheet>
      )}
    </>
  );
}
