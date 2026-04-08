import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import type { MedicationEntry } from '../../types/modules';
import { loadModuleData, saveModuleData } from '../../storage';
import { EmptyState, RecordCard } from '../../components/ModuleShared';
import { FormSheet, Field, Input, Select, Toggle } from '../../components/FormSheet';

const empty = (): Omit<MedicationEntry, 'id'> => ({
  name: '', dose: '', unit: 'мг', frequency: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '', reason: '', prescribedBy: 'vet', notify: false, notifyTime: '',
});

export function MedicationsModule({ petId }: { petId: string }) {
  const [entries, setEntries] = useState<MedicationEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty());

  useEffect(() => { loadModuleData<MedicationEntry>(petId, 'medications').then(setEntries); }, [petId]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const entry: MedicationEntry = { id: crypto.randomUUID(), ...form };
    const updated = [entry, ...entries];
    setEntries(updated);
    await saveModuleData(petId, 'medications', updated);
    setForm(empty());
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    await saveModuleData(petId, 'medications', updated);
  };

  return (
    <>
      <button className="module-add-btn" onClick={() => setShowForm(true)}>
        <Plus size={14} /> Добавить лекарство
      </button>

      {entries.length === 0 ? <EmptyState label="Лекарства" /> : (
        <div className="module-list">
          {entries.map(e => (
            <RecordCard key={e.id} date={e.startDate}
              badge={e.prescribedBy === 'vet' ? 'Врач' : 'Самостоятельно'}
              badgeColor={e.prescribedBy === 'vet' ? '#3498db' : '#9b59b6'}
              title={`${e.name} — ${e.dose} ${e.unit}`}
              fields={[
                { label: 'Частота', value: e.frequency },
                { label: 'Курс до', value: e.endDate },
                { label: 'Причина', value: e.reason },
                { label: 'Напоминание', value: e.notifyTime },
              ]}
              notify={e.notify}
              onDelete={() => handleDelete(e.id)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <FormSheet title="Добавить лекарство" onClose={() => setShowForm(false)} onSave={handleSave}>
          <Field label="Название препарата *"><Input placeholder="Например: Энтерофурил" value={form.name} onChange={set('name')} /></Field>
          <Field label="Доза и единица">
            <div className="field-row" style={{ display: 'flex', gap: 8 }}>
              <Input placeholder="5" value={form.dose} onChange={set('dose')} style={{ flex: 1 }} />
              <Select value={form.unit} onChange={set('unit')} style={{ width: 80 }}>
                <option value="мг">мг</option>
                <option value="мл">мл</option>
                <option value="таб">таб</option>
                <option value="кап">кап</option>
                <option value="другое">другое</option>
              </Select>
            </div>
          </Field>
          <Field label="Частота приёма"><Input placeholder="1 раз в день / каждые 8 часов" value={form.frequency} onChange={set('frequency')} /></Field>
          <Field label="Дата начала"><Input type="date" value={form.startDate} onChange={set('startDate')} /></Field>
          <Field label="Дата окончания"><Input type="date" value={form.endDate} onChange={set('endDate')} /></Field>
          <Field label="Причина назначения"><Input placeholder="Зачем назначено" value={form.reason} onChange={set('reason')} /></Field>
          <Field label="Кто назначил">
            <Select value={form.prescribedBy} onChange={set('prescribedBy')}>
              <option value="vet">Ветеринар</option>
              <option value="self">Самостоятельно</option>
            </Select>
          </Field>
          <Toggle label="Напоминание о приёме" checked={form.notify}
            onChange={v => setForm(p => ({ ...p, notify: v }))} />
          {form.notify && (
            <Field label="Время напоминания"><Input type="time" value={form.notifyTime} onChange={set('notifyTime')} /></Field>
          )}
        </FormSheet>
      )}
    </>
  );
}
