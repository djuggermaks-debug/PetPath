import { useEffect, useState } from 'react';
import type { DocumentEntry } from '../../types/modules';
import { loadModuleData, saveModuleData } from '../../storage';
import { EmptyState, RecordCard } from '../../components/ModuleShared';

const docTypeLabel = {
  passport: 'Паспорт', chip: 'Чип', insurance: 'Страховка',
  pedigree: 'Родословная', other: 'Документ',
};
const docTypeColor = {
  passport: '#3498db', chip: '#1abc9c', insurance: '#27ae60',
  pedigree: '#9b59b6', other: '#95a5a6',
};

export function DocumentsModule({ petId }: { petId: string }) {
  const [entries, setEntries] = useState<DocumentEntry[]>([]);

  useEffect(() => {
    loadModuleData<DocumentEntry>(petId, 'documents').then(setEntries);
  }, [petId]);

  const handleDelete = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    await saveModuleData(petId, 'documents', updated);
  };

  if (entries.length === 0) return <EmptyState label="Документы" />;

  return (
    <div className="module-list">
      {entries.map(e => (
        <RecordCard
          key={e.id}
          date={e.date}
          badge={docTypeLabel[e.type]}
          badgeColor={docTypeColor[e.type]}
          title={e.title}
          fields={[
            { label: 'Номер', value: e.number },
            { label: 'Действует до', value: e.expiry },
            { label: 'Заметки', value: e.notes },
          ]}
          onDelete={() => handleDelete(e.id)}
        />
      ))}
    </div>
  );
}
