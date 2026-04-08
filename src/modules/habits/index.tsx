import { useEffect, useState } from 'react';
import type { HabitEntry } from '../../types/modules';
import { loadModuleData, saveModuleData } from '../../storage';
import { EmptyState, RecordCard } from '../../components/ModuleShared';

const categoryLabel = {
  activity: 'Активность', sleep: 'Сон', play: 'Игры',
  command: 'Команды', behavior: 'Поведение', change: 'Изменение',
};
const categoryColor = {
  activity: '#27ae60', sleep: '#3498db', play: '#e67e22',
  command: '#9b59b6', behavior: '#1abc9c', change: '#e74c3c',
};
const activityLabel = { low: 'Низкая', medium: 'Средняя', high: 'Высокая' };

export function HabitsModule({ petId }: { petId: string }) {
  const [entries, setEntries] = useState<HabitEntry[]>([]);

  useEffect(() => {
    loadModuleData<HabitEntry>(petId, 'habits').then(setEntries);
  }, [petId]);

  const handleDelete = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    await saveModuleData(petId, 'habits', updated);
  };

  if (entries.length === 0) return <EmptyState label="Привычки" />;

  return (
    <div className="module-list">
      {entries.map(e => (
        <RecordCard
          key={e.id}
          date={e.date}
          badge={categoryLabel[e.category]}
          badgeColor={categoryColor[e.category]}
          title={e.description}
          fields={[
            { label: 'Активность', value: e.activityLevel ? activityLabel[e.activityLevel] : undefined },
          ]}
          onDelete={() => handleDelete(e.id)}
        />
      ))}
    </div>
  );
}
