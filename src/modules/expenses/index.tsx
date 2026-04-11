import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import type { ExpenseEntry } from '../../types/modules';
import { loadModuleData, saveModuleData } from '../../storage';
import { EmptyState, RecordCard } from '../../components/ModuleShared';
import { FormSheet, Field, Input, Select } from '../../components/FormSheet';

const empty = (): Omit<ExpenseEntry, 'id'> => ({
  date: new Date().toISOString().slice(0, 10),
  amount: 0,
  currency: '₽',
  category: 'food',
  description: '',
  shop: '',
});

const categoryLabel: Record<string, string> = {
  food: 'Питание', health: 'Здоровье', grooming: 'Груминг',
  items: 'Вещи', other: 'Другое',
};
const categoryColor: Record<string, string> = {
  food: '#27ae60', health: '#e74c3c', grooming: '#9b59b6',
  items: '#e67e22', other: '#95a5a6',
};

export function ExpensesModule({ petId }: { petId: string }) {
  const [entries, setEntries] = useState<ExpenseEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadModuleData<ExpenseEntry>(petId, 'expenses').then(setEntries); }, [petId]);

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

  const handleEdit = (entry: ExpenseEntry) => {
    const { id, ...rest } = entry;
    setForm(rest);
    setPreview(entry._photo ? `data:image/jpeg;base64,${entry._photo}` : null);
    setEditingId(id);
    setShowForm(true);
  };

  const handleClose = () => { setShowForm(false); setForm(empty()); setPreview(null); setEditingId(null); };

  const handleSave = async () => {
    if (!form.description.trim() || !form.amount) return;
    const entry = { id: editingId ?? crypto.randomUUID(), ...form, amount: Number(form.amount) };
    let updated: ExpenseEntry[];
    if (editingId) {
      updated = entries.map(e => e.id === editingId ? entry : e);
    } else {
      updated = [entry, ...entries];
    }
    setEntries(updated);
    await saveModuleData(petId, 'expenses', updated);
    handleClose();
  };

  const handleDelete = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    await saveModuleData(petId, 'expenses', updated);
  };

  const total = entries.reduce((s, e) => s + e.amount, 0);

  return (
    <>
      <button className="module-add-btn" onClick={() => setShowForm(true)}>
        <Plus size={14} /> Добавить расход
      </button>

      {entries.length > 0 && (
        <div className="expenses-total font-typewriter">
          Итого: {total.toLocaleString('ru-RU')} ₽
        </div>
      )}

      {entries.length === 0 ? <EmptyState label="Расходы" /> : (
        <div className="module-list">
          {entries.map(e => (
            <RecordCard key={e.id} date={e.date}
              badge={categoryLabel[e.category]} badgeColor={categoryColor[e.category]}
              title={`${e.description} — ${e.amount.toLocaleString('ru-RU')} ${e.currency}`}
              photo={e._photo}
              fields={[
                { label: 'Магазин / клиника', value: e.shop },
              ]}
              onEdit={() => handleEdit(e)}
              onDelete={() => handleDelete(e.id)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <FormSheet title={editingId ? 'Редактировать расход' : 'Добавить расход'} onClose={handleClose} onSave={handleSave}>
          <Field label="Описание *"><Input placeholder="Корм, визит к врачу, игрушка..." value={form.description} onChange={set('description')} /></Field>
          <Field label="Сумма и валюта">
            <div style={{ display: 'flex', gap: 8 }}>
              <Input
                type="number" placeholder="500" step="0.01"
                value={form.amount || ''}
                onChange={e => setForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                style={{ flex: 1 }}
              />
              <Select value={form.currency} onChange={set('currency')} style={{ width: 70 }}>
                <option value="₽">₽</option>
                <option value="$">$</option>
                <option value="€">€</option>
              </Select>
            </div>
          </Field>
          <Field label="Категория">
            <Select value={form.category} onChange={set('category')}>
              <option value="food">Питание</option>
              <option value="health">Здоровье / ветеринар</option>
              <option value="grooming">Груминг</option>
              <option value="items">Вещи / игрушки</option>
              <option value="other">Другое</option>
            </Select>
          </Field>
          <Field label="Дата"><Input type="date" value={form.date} onChange={set('date')} /></Field>
          <Field label="Магазин / клиника"><Input placeholder="Где куплено или оплачено" value={form.shop ?? ''} onChange={set('shop')} /></Field>
          <Field label="Фото чека">
            <div className="photo-upload-small" onClick={() => fileRef.current?.click()} style={{ cursor: 'pointer' }}>
              {preview
                ? <img src={preview} alt="чек" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 6 }} />
                : <span style={{ color: 'var(--ink-faded)', fontSize: 13 }}>Нажмите чтобы добавить фото чека</span>
              }
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} hidden />
            </div>
          </Field>
        </FormSheet>
      )}
    </>
  );
}
