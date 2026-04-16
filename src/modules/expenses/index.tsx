import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import type { ExpenseEntry } from '../../types/modules';
import { loadModuleData, saveModuleData } from '../../storage';
import { EmptyState, RecordCard } from '../../components/ModuleShared';
import { FormSheet, Field, Input, Select } from '../../components/FormSheet';
import { useTranslation } from 'react-i18next';
import { appLang } from '../../i18n';

const empty = (): Omit<ExpenseEntry, 'id'> => ({
  date: new Date().toISOString().slice(0, 10),
  amount: 0,
  currency: '€',
  category: 'food',
  description: '',
  shop: '',
});

const categoryColor: Record<string, string> = {
  food: '#27ae60', health: '#e74c3c', grooming: '#9b59b6',
  items: '#e67e22', other: '#95a5a6',
};

export function ExpensesModule({ petId }: { petId: string }) {
  const { t } = useTranslation();
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

  const categoryLabel: Record<string, string> = {
    food: t('expenses.catFood'), health: t('expenses.catHealth'),
    grooming: t('expenses.catGrooming'), items: t('expenses.catItems'), other: t('expenses.catOther'),
  };

  const total = entries.reduce((s, e) => s + e.amount, 0);
  const locale = appLang === 'ru' ? 'ru-RU' : 'en-GB';

  return (
    <>
      <button className="module-add-btn" onClick={() => setShowForm(true)}>
        <Plus size={14} /> {t('expenses.addBtn')}
      </button>

      {entries.length > 0 && (
        <div className="expenses-total font-typewriter">
          {t('expenses.total', { amount: total.toLocaleString(locale) + ' ' + (entries[0]?.currency ?? '€') })}
        </div>
      )}

      {entries.length === 0 ? <EmptyState label={t('modules.expenses.label')} /> : (
        <div className="module-list">
          {entries.map(e => (
            <RecordCard key={e.id} date={e.date}
              badge={categoryLabel[e.category]} badgeColor={categoryColor[e.category]}
              title={`${e.description} — ${e.amount.toLocaleString(locale)} ${e.currency}`}
              photo={e._photo}
              fields={[
                { label: t('expenses.fieldShop'), value: e.shop },
              ]}
              onEdit={() => handleEdit(e)}
              onDelete={() => handleDelete(e.id)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <FormSheet title={editingId ? t('expenses.formTitleEdit') : t('expenses.formTitleNew')} onClose={handleClose} onSave={handleSave}>
          <Field label={t('expenses.descriptionLabel')}><Input placeholder={t('expenses.descriptionPlaceholder')} value={form.description} onChange={set('description')} /></Field>
          <Field label={t('expenses.amountLabel')}>
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
          <Field label={t('expenses.categoryLabel')}>
            <Select value={form.category} onChange={set('category')}>
              <option value="food">{t('expenses.catFoodFull')}</option>
              <option value="health">{t('expenses.catHealthFull')}</option>
              <option value="grooming">{t('expenses.catGroomingFull')}</option>
              <option value="items">{t('expenses.catItemsFull')}</option>
              <option value="other">{t('expenses.catOtherFull')}</option>
            </Select>
          </Field>
          <Field label={t('expenses.dateLabel')}><Input type="date" value={form.date} onChange={set('date')} /></Field>
          <Field label={t('expenses.shopLabel')}><Input placeholder={t('expenses.shopPlaceholder')} value={form.shop ?? ''} onChange={set('shop')} /></Field>
          <Field label={t('expenses.receiptLabel')}>
            <div className="photo-upload-small" onClick={() => fileRef.current?.click()} style={{ cursor: 'pointer' }}>
              {preview
                ? <img src={preview} alt="receipt" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 6 }} />
                : <span style={{ color: 'var(--ink-faded)', fontSize: 13 }}>{t('expenses.addReceiptHint')}</span>
              }
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} hidden />
            </div>
          </Field>
        </FormSheet>
      )}
    </>
  );
}
