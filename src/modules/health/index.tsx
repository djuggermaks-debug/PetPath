import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import type { HealthEntry } from '../../types/modules';
import { loadModuleData, saveModuleData } from '../../storage';
import { EmptyState, RecordCard, severityLabel } from '../../components/ModuleShared';
import { FormSheet, Field, Input, Select, Toggle } from '../../components/FormSheet';
import { useTranslation } from 'react-i18next';

const empty = (): Omit<HealthEntry, 'id'> => ({
  date: new Date().toISOString().slice(0, 10),
  type: 'symptom',
  description: '',
  vet: '', clinic: '', reason: '', result: '', diagnosis: '',
  nextVisitDate: '', nextVisitNotify: false, severity: 'mild',
});

export function HealthModule({ petId }: { petId: string }) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<HealthEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty());
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => { loadModuleData<HealthEntry>(petId, 'health').then(setEntries); }, [petId]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleEdit = (entry: HealthEntry) => {
    const { id, ...rest } = entry;
    setForm(rest);
    setEditingId(id);
    setShowForm(true);
  };

  const handleClose = () => { setShowForm(false); setForm(empty()); setEditingId(null); };

  const handleSave = async () => {
    if (!form.description.trim()) return;
    let updated: HealthEntry[];
    if (editingId) {
      updated = entries.map(e => e.id === editingId ? { id: editingId, ...form } : e);
    } else {
      updated = [{ id: crypto.randomUUID(), ...form }, ...entries];
    }
    setEntries(updated);
    await saveModuleData(petId, 'health', updated);
    handleClose();
  };

  const handleDelete = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    await saveModuleData(petId, 'health', updated);
  };

  const typeLabel: Record<string, string> = {
    symptom: t('health.typeSymptom'),
    visit: t('health.typeVisit'),
    diagnosis: t('health.typeDiagnosis'),
  };
  const typeColor: Record<string, string> = { symptom: '#e67e22', visit: '#3498db', diagnosis: '#e74c3c' };

  return (
    <>
      <button className="module-add-btn" onClick={() => setShowForm(true)}>
        <Plus size={14} /> {t('health.addBtn')}
      </button>

      {entries.length === 0 ? <EmptyState label={t('modules.health.label')} /> : (
        <div className="module-list">
          {entries.map(e => (
            <RecordCard key={e.id} date={e.date}
              badge={typeLabel[e.type]} badgeColor={typeColor[e.type]}
              title={e.description}
              photo={e._photo}
              fields={[
                { label: t('health.fieldDoctor'), value: e.vet },
                { label: t('health.fieldClinic'), value: e.clinic },
                { label: t('health.fieldReason'), value: e.reason },
                { label: t('health.fieldResult'), value: e.result },
                { label: t('health.fieldDiagnosis'), value: e.diagnosis },
                { label: t('health.fieldSeverity'), value: e.severity ? severityLabel(e.severity, t) : undefined },
                { label: t('health.fieldNextVisit'), value: e.nextVisitDate },
              ]}
              notify={e.nextVisitNotify}
              onEdit={() => handleEdit(e)}
              onDelete={() => handleDelete(e.id)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <FormSheet title={editingId ? t('health.formTitleEdit') : t('health.formTitleNew')} onClose={handleClose} onSave={handleSave}>
          <Field label={t('health.typeLabel')}>
            <Select value={form.type} onChange={set('type')}>
              <option value="symptom">{t('health.typeSymptom')}</option>
              <option value="visit">{t('health.typeVisit')}</option>
              <option value="diagnosis">{t('health.typeDiagnosis')}</option>
            </Select>
          </Field>
          <Field label={t('health.dateLabel')}><Input type="date" value={form.date} onChange={set('date')} /></Field>
          <Field label={t('health.descriptionLabel')}><Input placeholder={t('health.descriptionPlaceholder')} value={form.description} onChange={set('description')} /></Field>

          {form.type === 'symptom' && (
            <Field label={t('health.severityLabel')}>
              <Select value={form.severity} onChange={set('severity')}>
                <option value="mild">{t('severity.mild')}</option>
                <option value="moderate">{t('severity.moderate')}</option>
                <option value="severe">{t('severity.severe')}</option>
              </Select>
            </Field>
          )}

          {(form.type === 'visit' || form.type === 'diagnosis') && (
            <>
              <Field label={t('health.doctorLabel')}><Input placeholder={t('health.doctorPlaceholder')} value={form.vet} onChange={set('vet')} /></Field>
              <Field label={t('health.clinicLabel')}><Input placeholder={t('health.clinicPlaceholder')} value={form.clinic} onChange={set('clinic')} /></Field>
              <Field label={t('health.reasonLabel')}><Input placeholder={t('health.reasonPlaceholder')} value={form.reason} onChange={set('reason')} /></Field>
              <Field label={t('health.resultLabel')}><Input placeholder={t('health.resultPlaceholder')} value={form.result} onChange={set('result')} /></Field>
            </>
          )}

          {form.type === 'diagnosis' && (
            <Field label={t('health.diagnosisLabel')}><Input placeholder={t('health.diagnosisPlaceholder')} value={form.diagnosis} onChange={set('diagnosis')} /></Field>
          )}

          {form.type === 'visit' && (
            <>
              <Field label={t('health.nextVisitLabel')}><Input type="date" value={form.nextVisitDate} onChange={set('nextVisitDate')} /></Field>
              <Toggle label={t('health.notifyLabel')} checked={!!form.nextVisitNotify}
                onChange={v => setForm(p => ({ ...p, nextVisitNotify: v }))} />
            </>
          )}
        </FormSheet>
      )}
    </>
  );
}
