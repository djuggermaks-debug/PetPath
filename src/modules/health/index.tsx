import { useEffect, useState } from 'react';
import type { HealthEntry } from '../../types/modules';
import { loadModuleData, saveModuleData } from '../../storage';
import { EmptyState, RecordCard, severityLabel } from '../../components/ModuleShared';

const typeLabel = { symptom: 'Симптом', visit: 'Визит', diagnosis: 'Диагноз' };
const typeColor = { symptom: '#e67e22', visit: '#3498db', diagnosis: '#e74c3c' };

export function HealthModule({ petId }: { petId: string }) {
  const [entries, setEntries] = useState<HealthEntry[]>([]);

  useEffect(() => {
    loadModuleData<HealthEntry>(petId, 'health').then(setEntries);
  }, [petId]);

  const handleDelete = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    await saveModuleData(petId, 'health', updated);
  };

  if (entries.length === 0) return <EmptyState label="Здоровье" />;

  return (
    <div className="module-list">
      {entries.map(e => (
        <RecordCard
          key={e.id}
          date={e.date}
          badge={typeLabel[e.type]}
          badgeColor={typeColor[e.type]}
          title={e.description}
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
          onDelete={() => handleDelete(e.id)}
        />
      ))}
    </div>
  );
}
