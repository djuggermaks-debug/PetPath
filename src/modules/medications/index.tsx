import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import type { MedicationEntry } from '../../types/modules';
import { loadModuleData, saveModuleData } from '../../storage';
import { EmptyState, RecordCard } from '../../components/ModuleShared';
import { FormSheet, Field, Input, Select, Toggle } from '../../components/FormSheet';
import { useTranslation } from 'react-i18next';

const empty = (): Omit<MedicationEntry, 'id'> => ({
  name: '', dose: '', unit: 'мг', frequency: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '', reason: '', prescribedBy: 'vet', notify: false, notifyTime: '',
});

export function MedicationsModule({ petId }: { petId: string }) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<MedicationEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty());
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => { loadModuleData<MedicationEntry>(petId, 'medications').then(setEntries); }, [petId]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleEdit = (entry: MedicationEntry) => {
    const { id, ...rest } = entry;
    setForm(rest);
    setEditingId(id);
    setShowForm(true);
  };

  const handleClose = () => { setShowForm(false); setForm(empty()); setEditingId(null); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    let updated: MedicationEntry[];
    if (editingId) {
      updated = entries.map(e => e.id === editingId ? { id: editingId, ...form } : e);
    } else {
      updated = [{ id: crypto.randomUUID(), ...form }, ...entries];
    }
    setEntries(updated);
    await saveModuleData(petId, 'medications', updated);
    handleClose();
  };

  const handleDelete = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    await saveModuleData(petId, 'medications', updated);
  };

  return (
    <>
      <button className="module-add-btn" onClick={() => setShowForm(true)}>
        <Plus size={14} /> {t('medications.addBtn')}
      </button>

      {entries.length === 0 ? <EmptyState label={t('modules.medications.label')} /> : (
        <div className="module-list">
          {entries.map(e => (
            <RecordCard key={e.id} date={e.startDate}
              badge={e.prescribedBy === 'vet' ? t('medications.badgeVet') : t('medications.badgeSelf')}
              badgeColor={e.prescribedBy === 'vet' ? '#3498db' : '#9b59b6'}
              title={`${e.name} — ${e.dose} ${e.unit}`}
              fields={[
                { label: t('medications.fieldFrequency'), value: e.frequency },
                { label: t('medications.fieldEndDate'), value: e.endDate },
                { label: t('medications.fieldReason'), value: e.reason },
                { label: t('medications.fieldNotify'), value: e.notifyTime },
              ]}
              notify={e.notify}
              onEdit={() => handleEdit(e)}
              onDelete={() => handleDelete(e.id)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <FormSheet title={editingId ? t('medications.formTitleEdit') : t('medications.formTitleNew')} onClose={handleClose} onSave={handleSave}>
          <Field label={t('medications.nameLabel')}><Input placeholder={t('medications.namePlaceholder')} value={form.name} onChange={set('name')} /></Field>
          <Field label={t('medications.doseLabel')}>
            <div className="field-row" style={{ display: 'flex', gap: 8 }}>
              <Input placeholder="5" value={form.dose} onChange={set('dose')} style={{ flex: 1 }} />
              <Select value={form.unit} onChange={set('unit')} style={{ width: 80 }}>
                <option value="мг">{t('medications.unitMg')}</option>
                <option value="мл">{t('medications.unitMl')}</option>
                <option value="таб">{t('medications.unitTab')}</option>
                <option value="кап">{t('medications.unitDrop')}</option>
                <option value="другое">{t('medications.unitOther')}</option>
              </Select>
            </div>
          </Field>
          <Field label={t('medications.frequencyLabel')}><Input placeholder={t('medications.frequencyPlaceholder')} value={form.frequency} onChange={set('frequency')} /></Field>
          <Field label={t('medications.startDateLabel')}><Input type="date" value={form.startDate} onChange={set('startDate')} /></Field>
          <Field label={t('medications.endDateLabel')}><Input type="date" value={form.endDate} onChange={set('endDate')} /></Field>
          <Field label={t('medications.reasonLabel')}><Input placeholder={t('medications.reasonPlaceholder')} value={form.reason} onChange={set('reason')} /></Field>
          <Field label={t('medications.prescribedByLabel')}>
            <Select value={form.prescribedBy} onChange={set('prescribedBy')}>
              <option value="vet">{t('medications.prescribedByVet')}</option>
              <option value="self">{t('medications.prescribedBySelf')}</option>
            </Select>
          </Field>
          <Toggle label={t('medications.notifyLabel')} checked={form.notify}
            onChange={v => setForm(p => ({ ...p, notify: v }))} />
          {form.notify && (
            <Field label={t('medications.notifyTimeLabel')}><Input type="time" value={form.notifyTime} onChange={set('notifyTime')} /></Field>
          )}
        </FormSheet>
      )}
    </>
  );
}
