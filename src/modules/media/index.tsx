import { useEffect, useState, useRef } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import type { MediaEntry } from '../../types/modules';
import { loadModuleData, saveModuleData } from '../../storage';
import { EmptyState } from '../../components/ModuleShared';
import { FormSheet, Field, Input, Select } from '../../components/FormSheet';
import { formatDate } from '../../components/ModuleShared';
import { useTranslation } from 'react-i18next';

const empty = (): Omit<MediaEntry, 'id'> => ({
  date: new Date().toISOString().slice(0, 10),
  type: 'photo', url: '', caption: '', category: 'regular',
});

export function MediaModule({ petId }: { petId: string }) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<MediaEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty());
  const [preview, setPreview] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadModuleData<MediaEntry>(petId, 'media').then(setEntries); }, [petId]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setPreview(url);
      setForm(p => ({ ...p, url, type: file.type.startsWith('video') ? 'video' : 'photo' }));
    };
    reader.readAsDataURL(file);
  };

  const handleEdit = (entry: MediaEntry) => {
    const { id, ...rest } = entry;
    setForm(rest);
    setPreview(entry.url);
    setEditingId(id);
    setShowForm(true);
  };

  const handleClose = () => { setShowForm(false); setForm(empty()); setPreview(null); setEditingId(null); };

  const handleSave = async () => {
    if (!form.url || saving) return;
    setSaving(true);
    try {
      let updated: MediaEntry[];
      if (editingId) {
        updated = entries.map(e => e.id === editingId ? { id: editingId, ...form } : e);
      } else {
        updated = [{ id: crypto.randomUUID(), ...form }, ...entries];
      }
      setEntries(updated);
      await saveModuleData(petId, 'media', updated);
      handleClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    await saveModuleData(petId, 'media', updated);
  };

  const categoryLabel: Record<string, string> = {
    regular: t('media.catRegular'),
    vet: t('media.catVet'),
    before_after: t('media.catBeforeAfter'),
  };

  return (
    <>
      <button className="module-add-btn" onClick={() => setShowForm(true)}>
        <Plus size={14} /> {t('media.addBtn')}
      </button>

      {entries.length === 0 ? <EmptyState label={t('modules.media.label')} /> : (
        <div className="media-grid">
          {entries.map(e => (
            <div key={e.id} className="media-item">
              {e.type === 'photo'
                ? <img src={e.url} alt={e.caption ?? ''} className="media-thumb" />
                : <video src={e.url} className="media-thumb" />
              }
              <div className="media-item-info">
                <span className="media-date font-typewriter">{formatDate(e.date)}</span>
                {e.caption && <span className="media-caption">{e.caption}</span>}
                <span className="media-category">{categoryLabel[e.category]}</span>
              </div>
              <button className="media-edit-btn" onClick={() => handleEdit(e)}>
                <Pencil size={12} />
              </button>
              <button className="media-delete-btn" onClick={() => handleDelete(e.id)}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <FormSheet title={editingId ? t('media.formTitleEdit') : t('media.formTitleNew')} onClose={handleClose} onSave={handleSave} saving={saving}>
          <div className="media-upload-area" onClick={() => fileRef.current?.click()}>
            {preview
              ? <img src={preview} alt="preview" className="media-upload-preview" />
              : <div className="media-upload-placeholder"><Plus size={24} /><span>{t('media.uploadPlaceholder')}</span></div>
            }
            <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} hidden />
          </div>
          <Field label={t('media.captionLabel')}><Input placeholder={t('media.captionPlaceholder')} value={form.caption} onChange={set('caption')} /></Field>
          <Field label={t('media.categoryLabel')}>
            <Select value={form.category} onChange={set('category')}>
              <option value="regular">{t('media.catRegularFull')}</option>
              <option value="vet">{t('media.catVetFull')}</option>
              <option value="before_after">{t('media.catBeforeAfterFull')}</option>
            </Select>
          </Field>
          <Field label={t('media.dateLabel')}><Input type="date" value={form.date} onChange={set('date')} /></Field>
        </FormSheet>
      )}
    </>
  );
}
