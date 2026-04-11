import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import type { ItemEntry } from '../../types/modules';
import { loadModuleData, saveModuleData } from '../../storage';
import { EmptyState, RecordCard } from '../../components/ModuleShared';
import { FormSheet, Field, Input, Select } from '../../components/FormSheet';

const empty = (): Omit<ItemEntry, 'id'> => ({
  name: '', category: 'toy', condition: 'new',
  reaction: 'likes', purchaseDate: new Date().toISOString().slice(0, 10),
  notes: '',
});

const categoryLabel: Record<string, string> = {
  toy: 'Игрушка', bed: 'Лежанка', feeder: 'Кормление',
  leash: 'Выгул', clothing: 'Одежда', cage: 'Домик/Клетка', other: 'Другое',
};
const categoryColor: Record<string, string> = {
  toy: '#e67e22', bed: '#3498db', feeder: '#27ae60',
  leash: '#9b59b6', clothing: '#e91e63', cage: '#1abc9c', other: '#95a5a6',
};
const conditionLabel: Record<string, string> = { new: 'Новое', used: 'В использовании', worn: 'Изношено' };
const reactionLabel: Record<string, string> = { loves: 'Обожает', likes: 'Нравится', ignores: 'Игнорирует', afraid: 'Боится' };

export function ItemsModule({ petId }: { petId: string }) {
  const [entries, setEntries] = useState<ItemEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadModuleData<ItemEntry>(petId, 'items').then(setEntries); }, [petId]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setPreview(url);
      setForm(p => ({ ...p, _photo: url.split(',')[1] }));
    };
    reader.readAsDataURL(file);
  };

  const handleEdit = (entry: ItemEntry) => {
    const { id, ...rest } = entry;
    setForm(rest);
    setPreview(entry._photo ? `data:image/jpeg;base64,${entry._photo}` : null);
    setEditingId(id);
    setShowForm(true);
  };

  const handleClose = () => { setShowForm(false); setForm(empty()); setPreview(null); setEditingId(null); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    let updated: ItemEntry[];
    if (editingId) {
      updated = entries.map(e => e.id === editingId ? { id: editingId, ...form } : e);
    } else {
      updated = [{ id: crypto.randomUUID(), ...form }, ...entries];
    }
    setEntries(updated);
    await saveModuleData(petId, 'items', updated);
    handleClose();
  };

  const handleDelete = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    await saveModuleData(petId, 'items', updated);
  };

  return (
    <>
      <button className="module-add-btn" onClick={() => setShowForm(true)}>
        <Plus size={14} /> Добавить вещь
      </button>

      {entries.length === 0 ? <EmptyState label="Вещи" /> : (
        <div className="module-list">
          {entries.map(e => (
            <RecordCard key={e.id} date={e.purchaseDate}
              badge={categoryLabel[e.category]} badgeColor={categoryColor[e.category]}
              title={e.name}
              photo={e._photo}
              fields={[
                { label: 'Состояние', value: e.condition ? conditionLabel[e.condition] : undefined },
                { label: 'Реакция', value: e.reaction ? reactionLabel[e.reaction] : undefined },
                { label: 'Заметки', value: e.notes },
              ]}
              onEdit={() => handleEdit(e)}
              onDelete={() => handleDelete(e.id)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <FormSheet title={editingId ? 'Редактировать вещь' : 'Добавить вещь'} onClose={handleClose} onSave={handleSave}>
          <Field label="Название *"><Input placeholder="Мышка на верёвке, лежанка..." value={form.name} onChange={set('name')} /></Field>
          <Field label="Категория">
            <Select value={form.category} onChange={set('category')}>
              <option value="toy">Игрушка</option>
              <option value="bed">Лежанка / спальное место</option>
              <option value="feeder">Миска / поилка</option>
              <option value="leash">Поводок / шлейка</option>
              <option value="clothing">Одежда / аксессуары</option>
              <option value="cage">Домик / клетка / переноска</option>
              <option value="other">Другое</option>
            </Select>
          </Field>
          <Field label="Реакция питомца">
            <Select value={form.reaction ?? 'likes'} onChange={set('reaction')}>
              <option value="loves">Обожает</option>
              <option value="likes">Нравится</option>
              <option value="ignores">Игнорирует</option>
              <option value="afraid">Боится</option>
            </Select>
          </Field>
          <Field label="Состояние">
            <Select value={form.condition ?? 'new'} onChange={set('condition')}>
              <option value="new">Новое</option>
              <option value="used">В использовании</option>
              <option value="worn">Изношено</option>
            </Select>
          </Field>
          <Field label="Дата покупки"><Input type="date" value={form.purchaseDate ?? ''} onChange={set('purchaseDate')} /></Field>
          <Field label="Заметки"><Input placeholder="Дополнительно..." value={form.notes ?? ''} onChange={set('notes')} /></Field>
          <Field label="Фото">
            <div className="photo-upload-small" onClick={() => fileRef.current?.click()} style={{ cursor: 'pointer' }}>
              {preview
                ? <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 6 }} />
                : <span style={{ color: 'var(--ink-faded)', fontSize: 13 }}>Нажмите чтобы добавить фото</span>
              }
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} hidden />
            </div>
          </Field>
        </FormSheet>
      )}
    </>
  );
}
