import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import type { NutritionEntry } from '../../types/modules';
import { loadModuleData, saveModuleData } from '../../storage';
import { EmptyState, RecordCard } from '../../components/ModuleShared';
import { FormSheet, Field, Input, Select } from '../../components/FormSheet';
import { useTranslation } from 'react-i18next';

const empty = (): Omit<NutritionEntry, 'id'> => ({
  date: new Date().toISOString().slice(0, 10),
  feedType: 'dry', brand: '', portionSize: '',
  frequency: '', restrictions: '', favorites: '', dislikes: '', reaction: '',
});

export function NutritionModule({ petId }: { petId: string }) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty());
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => { loadModuleData<NutritionEntry>(petId, 'nutrition').then(setEntries); }, [petId]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleEdit = (entry: NutritionEntry) => {
    const { id, ...rest } = entry;
    setForm(rest);
    setEditingId(id);
    setShowForm(true);
  };

  const handleClose = () => { setShowForm(false); setForm(empty()); setEditingId(null); };

  const handleSave = async () => {
    let updated: NutritionEntry[];
    if (editingId) {
      updated = entries.map(e => e.id === editingId ? { id: editingId, ...form } : e);
    } else {
      updated = [{ id: crypto.randomUUID(), ...form }, ...entries];
    }
    setEntries(updated);
    await saveModuleData(petId, 'nutrition', updated);
    handleClose();
  };

  const handleDelete = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    await saveModuleData(petId, 'nutrition', updated);
  };

  const feedTypeLabel: Record<string, string> = {
    dry: t('nutrition.feedTypeDry'),
    wet: t('nutrition.feedTypeWet'),
    natural: t('nutrition.feedTypeNatural'),
    mixed: t('nutrition.feedTypeMixed'),
  };

  return (
    <>
      <button className="module-add-btn" onClick={() => setShowForm(true)}>
        <Plus size={14} /> {t('nutrition.addBtn')}
      </button>

      {entries.length === 0 ? <EmptyState label={t('modules.nutrition.label')} /> : (
        <div className="module-list">
          {entries.map(e => (
            <RecordCard key={e.id} date={e.date}
              badge={feedTypeLabel[e.feedType]} badgeColor="#27ae60"
              title={e.brand || feedTypeLabel[e.feedType]}
              fields={[
                { label: t('nutrition.fieldPortion'), value: e.portionSize },
                { label: t('nutrition.fieldFrequency'), value: e.frequency },
                { label: t('nutrition.fieldRestrictions'), value: e.restrictions },
                { label: t('nutrition.fieldFavorites'), value: e.favorites },
                { label: t('nutrition.fieldDislikes'), value: e.dislikes },
                { label: t('nutrition.fieldReaction'), value: e.reaction },
              ]}
              onEdit={() => handleEdit(e)}
              onDelete={() => handleDelete(e.id)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <FormSheet title={editingId ? t('nutrition.formTitleEdit') : t('nutrition.formTitleNew')} onClose={handleClose} onSave={handleSave}>
          <Field label={t('nutrition.feedTypeLabel')}>
            <Select value={form.feedType} onChange={set('feedType')}>
              <option value="dry">{t('nutrition.feedTypeDry')}</option>
              <option value="wet">{t('nutrition.feedTypeWet')}</option>
              <option value="natural">{t('nutrition.feedTypeNatural')}</option>
              <option value="mixed">{t('nutrition.feedTypeMixed')}</option>
            </Select>
          </Field>
          <Field label={t('nutrition.brandLabel')}><Input placeholder="Royal Canin, Brit..." value={form.brand} onChange={set('brand')} /></Field>
          <Field label={t('nutrition.portionLabel')}><Input placeholder={t('nutrition.portionPlaceholder')} value={form.portionSize} onChange={set('portionSize')} /></Field>
          <Field label={t('nutrition.frequencyLabel')}><Input placeholder={t('nutrition.frequencyPlaceholder')} value={form.frequency} onChange={set('frequency')} /></Field>
          <Field label={t('nutrition.restrictionsLabel')}><Input placeholder={t('nutrition.restrictionsPlaceholder')} value={form.restrictions} onChange={set('restrictions')} /></Field>
          <Field label={t('nutrition.favoritesLabel')}><Input placeholder={t('nutrition.favoritesPlaceholder')} value={form.favorites} onChange={set('favorites')} /></Field>
          <Field label={t('nutrition.dislikesLabel')}><Input placeholder={t('nutrition.dislikesPlaceholder')} value={form.dislikes} onChange={set('dislikes')} /></Field>
          <Field label={t('nutrition.reactionLabel')}><Input placeholder={t('nutrition.reactionPlaceholder')} value={form.reaction} onChange={set('reaction')} /></Field>
        </FormSheet>
      )}
    </>
  );
}
