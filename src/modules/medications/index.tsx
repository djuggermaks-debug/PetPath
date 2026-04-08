import { useEffect, useState } from 'react';
import type { MedicationEntry } from '../../types/modules';
import { loadModuleData, saveModuleData } from '../../storage';
import { EmptyState, RecordCard } from '../../components/ModuleShared';

export function MedicationsModule({ petId }: { petId: string }) {
  const [entries, setEntries] = useState<MedicationEntry[]>([]);

  useEffect(() => {
    loadModuleData<MedicationEntry>(petId, 'medications').then(setEntries);
  }, [petId]);

  const handleDelete = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    await saveModuleData(petId, 'medications', updated);
  };

  if (entries.length === 0) return <EmptyState label="Лекарства" />;

  return (
    <div className="module-list">
      {entries.map(e => (
        <RecordCard
          key={e.id}
          date={e.startDate}
          badge={e.prescribedBy === 'vet' ? 'Врач' : 'Самостоятельно'}
          badgeColor={e.prescribedBy === 'vet' ? '#3498db' : '#9b59b6'}
          title={`${e.name} — ${e.dose} ${e.unit}`}
          fields={[
            { label: 'Частота', value: e.frequency },
            { label: 'Курс до', value: e.endDate },
            { label: 'Причина', value: e.reason },
            { label: 'Время напоминания', value: e.notifyTime },
          ]}
          notify={e.notify}
          onDelete={() => handleDelete(e.id)}
        />
      ))}
    </div>
  );
}
