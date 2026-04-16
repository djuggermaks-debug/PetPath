import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import type { DocumentEntry } from '../../types/modules';
import { loadModuleData, saveModuleData } from '../../storage';
import { EmptyState, RecordCard } from '../../components/ModuleShared';
import { FormSheet, Field, Input, Select } from '../../components/FormSheet';
import { useTranslation } from 'react-i18next';

const empty = (): Omit<DocumentEntry, 'id'> => ({
  type: 'passport', title: '', number: '', date: '', expiry: '', notes: '',
});

const docTypeColor: Record<string, string> = {
  passport: '#3498db', chip: '#1abc9c', insurance: '#27ae60',
  pedigree: '#9b59b6', other: '#95a5a6',
};

export function DocumentsModule({ petId }: { petId: string }) {
  const { t } = useTranslation();
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

  const docTypeLabel: Record<string, string> = {
    passport: t('documents.typePassport'),
    chip: t('documents.typeChip'),
    insurance: t('documents.typeInsurance'),
    pedigree: t('documents.typePedigree'),
    other: t('documents.typeOther'),
  };

  return (
    <>
      <button className="module-add-btn" onClick={() => setShowForm(true)}>
        <Plus size={14} /> {t('documents.addBtn')}
      </button>

      {entries.length === 0 ? <EmptyState label={t('modules.documents.label')} /> : (
        <div className="module-list">
          {entries.map(e => (
            <RecordCard key={e.id} date={e.date}
              badge={docTypeLabel[e.type]} badgeColor={docTypeColor[e.type]}
              title={e.title}
              fields={[
                { label: t('documents.fieldNumber'), value: e.number },
                { label: t('documents.fieldExpiry'), value: e.expiry },
                { label: t('documents.fieldNotes'), value: e.notes },
              ]}
              onEdit={() => handleEdit(e)}
              onDelete={() => handleDelete(e.id)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <FormSheet title={editingId ? t('documents.formTitleEdit') : t('documents.formTitleNew')} onClose={handleClose} onSave={handleSave}>
          <Field label={t('documents.typeLabel')}>
            <Select value={form.type} onChange={set('type')}>
              <option value="passport">{t('documents.typePassportFull')}</option>
              <option value="chip">{t('documents.typeChipFull')}</option>
              <option value="insurance">{t('documents.typeInsuranceFull')}</option>
              <option value="pedigree">{t('documents.typePedigreeFull')}</option>
              <option value="other">{t('documents.typeOtherFull')}</option>
            </Select>
          </Field>
          <Field label={t('documents.titleLabel')}><Input placeholder={t('documents.titlePlaceholder')} value={form.title} onChange={set('title')} /></Field>
          <Field label={t('documents.numberLabel')}><Input placeholder={t('documents.numberPlaceholder')} value={form.number} onChange={set('number')} /></Field>
          <Field label={t('documents.issueDateLabel')}><Input type="date" value={form.date} onChange={set('date')} /></Field>
          <Field label={t('documents.expiryLabel')}><Input type="date" value={form.expiry} onChange={set('expiry')} /></Field>
          <Field label={t('documents.notesLabel')}><Input placeholder={t('documents.notesPlaceholder')} value={form.notes} onChange={set('notes')} /></Field>
        </FormSheet>
      )}
    </>
  );
}
