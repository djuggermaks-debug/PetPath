import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import type { AllergyEntry } from '../../types/modules';
import { loadModuleData, saveModuleData } from '../../storage';
import { EmptyState, RecordCard, severityLabel, severityColor } from '../../components/ModuleShared';
import { FormSheet, Field, Input, Select, Toggle } from '../../components/FormSheet';
import { useTranslation } from 'react-i18next';

const empty = (): Omit<AllergyEntry, 'id'> => ({
  allergen: '', allergenType: 'food', reaction: '',
  severity: 'mild', firstDate: '', confirmedByVet: false,
});

export function AllergiesModule({ petId }: { petId: string }) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<AllergyEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty());
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => { loadModuleData<AllergyEntry>(petId, 'allergies').then(setEntries); }, [petId]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleEdit = (entry: AllergyEntry) => {
    const { id, ...rest } = entry;
    setForm(rest);
    setEditingId(id);
    setShowForm(true);
  };

  const handleClose = () => { setShowForm(false); setForm(empty()); setEditingId(null); };

  const handleSave = async () => {
    if (!form.allergen.trim()) return;
    let updated: AllergyEntry[];
    if (editingId) {
      updated = entries.map(e => e.id === editingId ? { id: editingId, ...form } : e);
    } else {
      updated = [{ id: crypto.randomUUID(), ...form }, ...entries];
    }
    setEntries(updated);
    await saveModuleData(petId, 'allergies', updated);
    handleClose();
  };

  const handleDelete = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    await saveModuleData(petId, 'allergies', updated);
  };

  const typeLabel: Record<string, string> = {
    food: t('allergies.typeFood'),
    plant: t('allergies.typePlant'),
    drug: t('allergies.typeDrug'),
    other: t('allergies.typeOther'),
  };

  return (
    <>
      <button className="module-add-btn" onClick={() => setShowForm(true)}>
        <Plus size={14} /> {t('allergies.addBtn')}
      </button>

      {entries.length === 0 ? <EmptyState label={t('modules.allergies.label')} /> : (
        <div className="module-list">
          {entries.map(e => (
            <RecordCard key={e.id} date={e.firstDate}
              badge={severityLabel(e.severity, t)} badgeColor={severityColor(e.severity)}
              title={`${e.allergen} (${typeLabel[e.allergenType]})`}
              photo={e._photo}
              fields={[
                { label: t('allergies.fieldReaction'), value: e.reaction },
                { label: t('allergies.fieldConfirmed'), value: e.confirmedByVet ? t('allergies.confirmedYes') : t('allergies.confirmedNo') },
              ]}
              onEdit={() => handleEdit(e)}
              onDelete={() => handleDelete(e.id)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <FormSheet title={editingId ? t('allergies.formTitleEdit') : t('allergies.formTitleNew')} onClose={handleClose} onSave={handleSave}>
          <Field label={t('allergies.allergenLabel')}><Input placeholder={t('allergies.allergenPlaceholder')} value={form.allergen} onChange={set('allergen')} /></Field>
          <Field label={t('allergies.allergenTypeLabel')}>
            <Select value={form.allergenType} onChange={set('allergenType')}>
              <option value="food">{t('allergies.typeFood')}</option>
              <option value="plant">{t('allergies.typePlant')}</option>
              <option value="drug">{t('allergies.typeDrug')}</option>
              <option value="other">{t('allergies.typeOther')}</option>
            </Select>
          </Field>
          <Field label={t('allergies.reactionLabel')}><Input placeholder={t('allergies.reactionPlaceholder')} value={form.reaction} onChange={set('reaction')} /></Field>
          <Field label={t('allergies.severityLabel')}>
            <Select value={form.severity} onChange={set('severity')}>
              <option value="mild">{t('severity.mild')}</option>
              <option value="moderate">{t('severity.moderate')}</option>
              <option value="severe">{t('severity.severe')}</option>
            </Select>
          </Field>
          <Field label={t('allergies.firstDateLabel')}><Input type="date" value={form.firstDate} onChange={set('firstDate')} /></Field>
          <Toggle label={t('allergies.confirmedLabel')} checked={form.confirmedByVet}
            onChange={v => setForm(p => ({ ...p, confirmedByVet: v }))} />
        </FormSheet>
      )}
    </>
  );
}
