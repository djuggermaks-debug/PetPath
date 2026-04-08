import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import type { HabitEntry } from '../../types/modules';
import { loadModuleData, saveModuleData } from '../../storage';
import { EmptyState, RecordCard } from '../../components/ModuleShared';
import { FormSheet, Field, Input, Select } from '../../components/FormSheet';

const empty = (): Omit<HabitEntry, 'id'> => ({
  date: new Date().toISOString().slice(0, 10),
  category: 'behavior', description: '', activityLevel: 'medium',
});

const categoryLabel: Record<string, string> = {
  activity: 'Активность', sleep: 'Сон', play: 'Игры',
  command: 'Команды', behavior: 'Поведение', change: 'Изменение',
};
const categoryColor: Record<string, string> = {
  activity: '#27ae60', sleep: '#3498db', play: '#e67e22',
  command: '#9b59b6', behavior: '#1abc9c', change: '#e74c3c',
};

export function HabitsModule({ petId }: { petId: string }) {
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty());

  useEffect(() => { loadModuleData<HabitEntry>(petId, 'habits').then(setEntries); }, [petId]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.description.trim()) return;
    const entry: HabitEntry = { id: crypto.randomUUID(), ...form };
    const updated = [entry, ...entries];
    setEntries(updated);
    await saveModuleData(petId, 'habits', updated);
    setForm(empty());
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    await saveModuleData(petId, 'habits', updated);
  };

  return (
    <>
      <button className="module-add-btn" onClick={() => setShowForm(true)}>
        <Plus size={14} /> Добавить запись
      </button>

      {entries.length === 0 ? <EmptyState label="Привычки" /> : (
        <div className="module-list">
          {entries.map(e => (
            <RecordCard key={e.id} date={e.date}
              badge={categoryLabel[e.category]} badgeColor={categoryColor[e.category]}
              title={e.description}
              fields={[
                { label: 'Активность', value: e.activityLevel === 'low' ? 'Низкая' : e.activityLevel === 'medium' ? 'Средняя' : 'Высокая' },
              ]}
              onDelete={() => handleDelete(e.id)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <FormSheet title="Добавить привычку" onClose={() => setShowForm(false)} onSave={handleSave}>
          <Field label="Категория">
            <Select value={form.category} onChange={set('category')}>
              <option value="activity">Активность</option>
              <option value="sleep">Режим сна</option>
              <option value="play">Игры и занятия</option>
              <option value="command">Выученная команда</option>
              <option value="behavior">Особенность поведения</option>
              <option value="change">Изменение в поведении</option>
            </Select>
          </Field>
          <Field label="Описание *"><Input placeholder="Опишите подробнее..." value={form.description} onChange={set('description')} /></Field>
          <Field label="Дата"><Input type="date" value={form.date} onChange={set('date')} /></Field>
          {form.category === 'activity' && (
            <Field label="Уровень активности">
              <Select value={form.activityLevel} onChange={set('activityLevel')}>
                <option value="low">Низкая</option>
                <option value="medium">Средняя</option>
                <option value="high">Высокая</option>
              </Select>
            </Field>
          )}
        </FormSheet>
      )}
    </>
  );
}
