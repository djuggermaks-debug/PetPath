import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import type { HealthEntry } from '../../types/modules';
import { loadModuleData, saveModuleData } from '../../storage';
import { EmptyState, RecordCard, severityLabel } from '../../components/ModuleShared';
import { FormSheet, Field, Input, Select, Toggle } from '../../components/FormSheet';

const empty = (): Omit<HealthEntry, 'id'> => ({
  date: new Date().toISOString().slice(0, 10),
  type: 'symptom',
  description: '',
  vet: '', clinic: '', reason: '', result: '', diagnosis: '',
  nextVisitDate: '', nextVisitNotify: false, severity: 'mild',
});

export function HealthModule({ petId }: { petId: string }) {
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

  const typeLabel: Record<string, string> = { symptom: 'Симптом', visit: 'Визит', diagnosis: 'Диагноз' };
  const typeColor: Record<string, string> = { symptom: '#e67e22', visit: '#3498db', diagnosis: '#e74c3c' };

  return (
    <>
      <button className="module-add-btn" onClick={() => setShowForm(true)}>
        <Plus size={14} /> Добавить запись
      </button>

      {entries.length === 0 ? <EmptyState label="Здоровье" /> : (
        <div className="module-list">
          {entries.map(e => (
            <RecordCard key={e.id} date={e.date}
              badge={typeLabel[e.type]} badgeColor={typeColor[e.type]}
              title={e.description}
              photo={e._photo}
              fields={[
                { label: 'Врач', value: e.vet },
                { label: 'Клиника', value: e.clinic },
                { label: 'Причина', value: e.reason },
                { label: 'Результат', value: e.result },
                { label: 'Диагноз', value: e.diagnosis },
                { label: 'Тяжесть', value: e.severity ? severityLabel(e.severity) : undefined },
                { label: 'Следующий визит', value: e.nextVisitDate },
              ]}
              notify={e.nextVisitNotify}
              onEdit={() => handleEdit(e)}
              onDelete={() => handleDelete(e.id)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <FormSheet title={editingId ? 'Редактировать запись' : 'Запись о здоровье'} onClose={handleClose} onSave={handleSave}>
          <Field label="Тип записи">
            <Select value={form.type} onChange={set('type')}>
              <option value="symptom">Симптом</option>
              <option value="visit">Визит к врачу</option>
              <option value="diagnosis">Диагноз</option>
            </Select>
          </Field>
          <Field label="Дата"><Input type="date" value={form.date} onChange={set('date')} /></Field>
          <Field label="Описание *"><Input placeholder="Опишите подробнее..." value={form.description} onChange={set('description')} /></Field>

          {form.type === 'symptom' && (
            <Field label="Тяжесть">
              <Select value={form.severity} onChange={set('severity')}>
                <option value="mild">Лёгкая</option>
                <option value="moderate">Средняя</option>
                <option value="severe">Тяжёлая</option>
              </Select>
            </Field>
          )}

          {(form.type === 'visit' || form.type === 'diagnosis') && (
            <>
              <Field label="Врач"><Input placeholder="ФИО врача" value={form.vet} onChange={set('vet')} /></Field>
              <Field label="Клиника"><Input placeholder="Название клиники" value={form.clinic} onChange={set('clinic')} /></Field>
              <Field label="Причина визита"><Input placeholder="Зачем обратились" value={form.reason} onChange={set('reason')} /></Field>
              <Field label="Результат / назначения"><Input placeholder="Что сказал врач" value={form.result} onChange={set('result')} /></Field>
            </>
          )}

          {form.type === 'diagnosis' && (
            <Field label="Диагноз"><Input placeholder="Поставленный диагноз" value={form.diagnosis} onChange={set('diagnosis')} /></Field>
          )}

          {form.type === 'visit' && (
            <>
              <Field label="Следующий визит"><Input type="date" value={form.nextVisitDate} onChange={set('nextVisitDate')} /></Field>
              <Toggle label="Уведомление о визите" checked={!!form.nextVisitNotify}
                onChange={v => setForm(p => ({ ...p, nextVisitNotify: v }))} />
            </>
          )}
        </FormSheet>
      )}
    </>
  );
}
