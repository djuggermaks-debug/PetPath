import { useEffect, useState } from 'react';
import type { MediaEntry } from '../../types/modules';
import { loadModuleData, saveModuleData } from '../../storage';
import { EmptyState } from '../../components/ModuleShared';
import { formatDate } from '../../components/ModuleShared';
import { Trash2 } from 'lucide-react';

const categoryLabel = { regular: 'Обычное', vet: 'У ветеринара', before_after: 'До/После' };

export function MediaModule({ petId }: { petId: string }) {
  const [entries, setEntries] = useState<MediaEntry[]>([]);

  useEffect(() => {
    loadModuleData<MediaEntry>(petId, 'media').then(setEntries);
  }, [petId]);

  const handleDelete = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    await saveModuleData(petId, 'media', updated);
  };

  if (entries.length === 0) return <EmptyState label="Медиабанк" />;

  return (
    <div className="media-grid">
      {entries.map(e => (
        <div key={e.id} className="media-item">
          {e.type === 'photo' ? (
            <img src={e.url} alt={e.caption ?? ''} className="media-thumb" />
          ) : (
            <video src={e.url} className="media-thumb" />
          )}
          <div className="media-item-info">
            <span className="media-date font-typewriter">{formatDate(e.date)}</span>
            {e.caption && <span className="media-caption">{e.caption}</span>}
            <span className="media-category">{categoryLabel[e.category]}</span>
          </div>
          <button className="media-delete-btn" onClick={() => handleDelete(e.id)}>
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
