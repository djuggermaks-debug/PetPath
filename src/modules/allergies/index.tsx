import { useEffect, useState } from 'react';
import type { AllergyEntry } from '../../types/modules';
import { loadModuleData, saveModuleData } from '../../storage';
import { EmptyState, RecordCard, severityLabel, severityColor } from '../../components/ModuleShared';

const typeLabel = { food: 'Еда', plant: 'Растение', drug: 'Препарат', other: 'Другое' };

export function AllergiesModule({ petId }: { petId: string }) {
  const [entries, setEntries] = useState<AllergyEntry[]>([]);

  useEffect(() => {
    loadModuleData<AllergyEntry>(petId, 'allergies').then(setEntries);
  }, [petId]);

  const handleDelete = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    await saveModuleData(petId, 'allergies', updated);
  };

  if (entries.length === 0) return <EmptyState label="Аллергии" />;

  return (
    <div className="module-list">
      {entries.map(e => (
        <RecordCard
          key={e.id}
          date={e.firstDate}
          badge={severityLabel(e.severity)}
          badgeColor={severityColor(e.severity)}
          title={`${e.allergen} (${typeLabel[e.allergenType]})`}
          fields={[
            { label: 'Реакция', value: e.reaction },
            { label: 'Подтверждено врачом', value: e.confirmedByVet ? 'Да' : 'Нет' },
          ]}
          onDelete={() => handleDelete(e.id)}
        />
      ))}
    </div>
  );
}
