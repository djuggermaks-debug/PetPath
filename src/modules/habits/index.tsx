import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import type { HabitEntry } from '../../types/modules';
import { loadModuleData, saveModuleData } from '../../storage';
import { EmptyState, RecordCard } from '../../components/ModuleShared';
import { FormSheet, Field, Input, Select } from '../../components/FormSheet';
import { useTranslation } from 'react-i18next';

const empty = (): Omit<HabitEntry, 'id'> => ({
  date: new Date().toISOString().slice(0, 10),
  category: 'behavior', description: '', activityLevel: 'medium',
});

const categoryColor: Record<string, string> = {
  activity: '#27ae60', sleep: '#3498db', play: '#e67e22',
  command: '#9b59b6', behavior: '#1abc9c', change: '#e74c3c',
};

export function HabitsModule({ petId }: { petId: string }) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty());
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => { loadModuleData<HabitEntry>(petId, 'habits').then(setEntries); }, [petId]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleEdit = (entry: HabitEntry) => {
    const { id, ...rest } = entry;
    setForm(rest);
    setEditingId(id);
    setShowForm(true);
  };

  const handleClose = () => { setShowForm(false); setForm(empty()); setEditingId(null); };

  const handleSave = async () => {
    if (!form.description.trim()) return;
    let updated: HabitEntry[];
    if (editingId) {
      updated = entries.map(e => e.id === editingId ? { id: editingId, ...form } : e);
    } else {
      updated = [{ id: crypto.randomUUID(), ...form }, ...entries];
    }
    setEntries(updated);
    await saveModuleData(petId, 'habits', updated);
    handleClose();
  };

  const handleDelete = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    await saveModuleData(petId, 'habits', updated);
  };

  const categoryLabel: Record<string, string> = {
    activity: t('habits.catActivity'), sleep: t('habits.catSleep'), play: t('habits.catPlay'),
    command: t('habits.catCommand'), behavior: t('habits.catBehavior'), change: t('habits.catChange'),
  };

  const activityLabel = (level: string) => ({
    low: t('habits.activityLow'), medium: t('habits.activityMedium'), high: t('habits.activityHigh'),
  }[level] ?? level);

  return (
    <>
      <button className="module-add-btn" onClick={() => setShowForm(true)}>
        <Plus size={14} /> {t('habits.addBtn')}
      </button>

      {entries.length === 0 ? <EmptyState label={t('modules.habits.label')} /> : (
        <div className="module-list">
          {entries.map(e => (
            <RecordCard key={e.id} date={e.date}
              badge={categoryLabel[e.category]} badgeColor={categoryColor[e.category]}
              title={e.description}
              fields={[
                { label: t('habits.fieldActivity'), value: e.activityLevel ? activityLabel(e.activityLevel) : undefined },
              ]}
              onEdit={() => handleEdit(e)}
              onDelete={() => handleDelete(e.id)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <FormSheet title={editingId ? t('habits.formTitleEdit') : t('habits.formTitleNew')} onClose={handleClose} onSave={handleSave}>
          <Field label={t('habits.categoryLabel')}>
            <Select value={form.category} onChange={set('category')}>
              <option value="activity">{t('habits.catActivityFull')}</option>
              <option value="sleep">{t('habits.catSleepFull')}</option>
              <option value="play">{t('habits.catPlayFull')}</option>
              <option value="command">{t('habits.catCommandFull')}</option>
              <option value="behavior">{t('habits.catBehaviorFull')}</option>
              <option value="change">{t('habits.catChangeFull')}</option>
            </Select>
          </Field>
          <Field label={t('habits.descriptionLabel')}><Input placeholder={t('habits.descriptionPlaceholder')} value={form.description} onChange={set('description')} /></Field>
          <Field label={t('habits.dateLabel')}><Input type="date" value={form.date} onChange={set('date')} /></Field>
          {form.category === 'activity' && (
            <Field label={t('habits.activityLevelLabel')}>
              <Select value={form.activityLevel} onChange={set('activityLevel')}>
                <option value="low">{t('habits.activityLow')}</option>
                <option value="medium">{t('habits.activityMedium')}</option>
                <option value="high">{t('habits.activityHigh')}</option>
              </Select>
            </Field>
          )}
        </FormSheet>
      )}
    </>
  );
}
