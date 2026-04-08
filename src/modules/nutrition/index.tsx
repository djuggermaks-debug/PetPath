import { useEffect, useState } from 'react';
import type { NutritionEntry } from '../../types/modules';
import { loadModuleData, saveModuleData } from '../../storage';
import { EmptyState, RecordCard } from '../../components/ModuleShared';

const feedTypeLabel = { dry: 'Сухой', wet: 'Влажный', natural: 'Натуральный', mixed: 'Смешанный' };

export function NutritionModule({ petId }: { petId: string }) {
  const [entries, setEntries] = useState<NutritionEntry[]>([]);

  useEffect(() => {
    loadModuleData<NutritionEntry>(petId, 'nutrition').then(setEntries);
  }, [petId]);

  const handleDelete = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    await saveModuleData(petId, 'nutrition', updated);
  };

  if (entries.length === 0) return <EmptyState label="Питание" />;

  return (
    <div className="module-list">
      {entries.map(e => (
        <RecordCard
          key={e.id}
          date={e.date}
          badge={feedTypeLabel[e.feedType]}
          badgeColor="#27ae60"
          title={e.brand ?? feedTypeLabel[e.feedType]}
          fields={[
            { label: 'Порция', value: e.portionSize },
            { label: 'Частота', value: e.frequency },
            { label: 'Ограничения', value: e.restrictions },
            { label: 'Любит', value: e.favorites },
            { label: 'Не ест', value: e.dislikes },
            { label: 'Реакция', value: e.reaction },
          ]}
          onDelete={() => handleDelete(e.id)}
        />
      ))}
    </div>
  );
}
