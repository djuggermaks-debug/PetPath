import { useEffect, useState } from 'react';
import type { VaccineEntry } from '../../types/modules';
import { loadModuleData, saveModuleData } from '../../storage';
import { EmptyState, RecordCard } from '../../components/ModuleShared';

export function VaccinesModule({ petId }: { petId: string }) {
  const [entries, setEntries] = useState<VaccineEntry[]>([]);

  useEffect(() => {
    loadModuleData<VaccineEntry>(petId, 'vaccines').then(setEntries);
  }, [petId]);

  const handleDelete = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    await saveModuleData(petId, 'vaccines', updated);
  };

  if (entries.length === 0) return <EmptyState label="Прививки" />;

  return (
    <div className="module-list">
      {entries.map(e => (
        <RecordCard
          key={e.id}
          date={e.date}
          title={e.name}
          fields={[
            { label: 'Препарат', value: e.drug },
            { label: 'Производитель', value: e.manufacturer },
            { label: 'Врач', value: e.vet },
            { label: 'Клиника', value: e.clinic },
            { label: 'Следующая', value: e.nextDate },
          ]}
          notify={e.notify}
          onDelete={() => handleDelete(e.id)}
        />
      ))}
    </div>
  );
}
