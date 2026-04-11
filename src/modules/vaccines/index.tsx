import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import type { VaccineEntry } from '../../types/modules';
import { loadModuleData, saveModuleData } from '../../storage';
import { EmptyState, RecordCard } from '../../components/ModuleShared';
import { FormSheet, Field, Input, Toggle } from '../../components/FormSheet';

const empty = (): Omit<VaccineEntry, 'id'> => ({
  name: '', date: new Date().toISOString().slice(0, 10),
  drug: '', manufacturer: '', vet: '', clinic: '', nextDate: '', notify: false,
});

export function VaccinesModule({ petId }: { petId: string }) {
  const [entries, setEntries] = useState<VaccineEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty());
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => { loadModuleData<VaccineEntry>(petId, 'vaccines').then(setEntries); }, [petId]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleEdit = (entry: VaccineEntry) => {
    const { id, ...rest } = entry;
    setForm(rest);
    setEditingId(id);
    setShowForm(true);
  };

  const handleClose = () => { setShowForm(false); setForm(empty()); setEditingId(null); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    let updated: VaccineEntry[];
    if (editingId) {
      updated = entries.map(e => e.id === editingId ? { id: editingId, ...form } : e);
    } else {
      updated = [{ id: crypto.randomUUID(), ...form }, ...entries];
    }
    setEntries(updated);
    await saveModuleData(petId, 'vaccines', updated);
    handleClose();
  };

  const handleDelete = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    await saveModuleData(petId, 'vaccines', updated);
  };

  return (
    <>
      <button className="module-add-btn" onClick={() => setShowForm(true)}>
        <Plus size={14} /> Добавить прививку
      </button>

      {entries.length === 0 ? <EmptyState label="Прививки" /> : (
        <div className="module-list">
          {entries.map(e => (
            <RecordCard key={e.id} date={e.date} title={e.name}
              fields={[
                { label: 'Препарат', value: e.drug },
                { label: 'Производитель', value: e.manufacturer },
                { label: 'Врач', value: e.vet },
                { label: 'Клиника', value: e.clinic },
                { label: 'Следующая', value: e.nextDate },
              ]}
              notify={e.notify}
              onEdit={() => handleEdit(e)}
              onDelete={() => handleDelete(e.id)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <FormSheet title={editingId ? 'Редактировать прививку' : 'Добавить прививку'} onClose={handleClose} onSave={handleSave}>
          <Field label="Название прививки *"><Input placeholder="Например: Нобивак" value={form.name} onChange={set('name')} /></Field>
          <Field label="Дата вакцинации"><Input type="date" value={form.date} onChange={set('date')} /></Field>
          <Field label="Препарат"><Input placeholder="Коммерческое название" value={form.drug} onChange={set('drug')} /></Field>
          <Field label="Производитель"><Input placeholder="Компания" value={form.manufacturer} onChange={set('manufacturer')} /></Field>
          <Field label="Врач"><Input placeholder="ФИО врача" value={form.vet} onChange={set('vet')} /></Field>
          <Field label="Клиника"><Input placeholder="Название клиники" value={form.clinic} onChange={set('clinic')} /></Field>
          <Field label="Дата следующей прививки"><Input type="date" value={form.nextDate} onChange={set('nextDate')} /></Field>
          <Toggle label="Уведомление" checked={form.notify}
            onChange={v => setForm(p => ({ ...p, notify: v }))} />
        </FormSheet>
      )}
    </>
  );
}
