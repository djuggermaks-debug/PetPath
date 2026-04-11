import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import type { DocumentEntry } from '../../types/modules';
import { loadModuleData, saveModuleData } from '../../storage';
import { EmptyState, RecordCard } from '../../components/ModuleShared';
import { FormSheet, Field, Input, Select } from '../../components/FormSheet';

const empty = (): Omit<DocumentEntry, 'id'> => ({
  type: 'passport', title: '', number: '', date: '', expiry: '', notes: '',
});

const docTypeLabel: Record<string, string> = {
  passport: 'Паспорт', chip: 'Чип', insurance: 'Страховка',
  pedigree: 'Родословная', other: 'Документ',
};
const docTypeColor: Record<string, string> = {
  passport: '#3498db', chip: '#1abc9c', insurance: '#27ae60',
  pedigree: '#9b59b6', other: '#95a5a6',
};

export function DocumentsModule({ petId }: { petId: string }) {
  const [entries, setEntries] = useState<DocumentEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty());
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => { loadModuleData<DocumentEntry>(petId, 'documents').then(setEntries); }, [petId]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleEdit = (entry: DocumentEntry) => {
    const { id, ...rest } = entry;
    setForm(rest);
    setEditingId(id);
    setShowForm(true);
  };

  const handleClose = () => { setShowForm(false); setForm(empty()); setEditingId(null); };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    let updated: DocumentEntry[];
    if (editingId) {
      updated = entries.map(e => e.id === editingId ? { id: editingId, ...form } : e);
    } else {
      updated = [{ id: crypto.randomUUID(), ...form }, ...entries];
    }
    setEntries(updated);
    await saveModuleData(petId, 'documents', updated);
    handleClose();
  };

  const handleDelete = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    await saveModuleData(petId, 'documents', updated);
  };

  return (
    <>
      <button className="module-add-btn" onClick={() => setShowForm(true)}>
        <Plus size={14} /> Добавить документ
      </button>

      {entries.length === 0 ? <EmptyState label="Документы" /> : (
        <div className="module-list">
          {entries.map(e => (
            <RecordCard key={e.id} date={e.date}
              badge={docTypeLabel[e.type]} badgeColor={docTypeColor[e.type]}
              title={e.title}
              fields={[
                { label: 'Номер', value: e.number },
                { label: 'Действует до', value: e.expiry },
                { label: 'Заметки', value: e.notes },
              ]}
              onEdit={() => handleEdit(e)}
              onDelete={() => handleDelete(e.id)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <FormSheet title={editingId ? 'Редактировать документ' : 'Добавить документ'} onClose={handleClose} onSave={handleSave}>
          <Field label="Тип документа">
            <Select value={form.type} onChange={set('type')}>
              <option value="passport">Ветеринарный паспорт</option>
              <option value="chip">Чип</option>
              <option value="insurance">Страховка</option>
              <option value="pedigree">Родословная</option>
              <option value="other">Другой документ</option>
            </Select>
          </Field>
          <Field label="Название / описание *"><Input placeholder="Например: Паспорт RU 123456" value={form.title} onChange={set('title')} /></Field>
          <Field label="Номер документа"><Input placeholder="Серия и номер" value={form.number} onChange={set('number')} /></Field>
          <Field label="Дата выдачи"><Input type="date" value={form.date} onChange={set('date')} /></Field>
          <Field label="Срок действия до"><Input type="date" value={form.expiry} onChange={set('expiry')} /></Field>
          <Field label="Заметки"><Input placeholder="Дополнительная информация" value={form.notes} onChange={set('notes')} /></Field>
        </FormSheet>
      )}
    </>
  );
}
