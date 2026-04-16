import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import type { ItemEntry } from '../../types/modules';
import { loadModuleData, saveModuleData } from '../../storage';
import { EmptyState, RecordCard } from '../../components/ModuleShared';
import { FormSheet, Field, Input, Select } from '../../components/FormSheet';
import { useTranslation } from 'react-i18next';

const empty = (): Omit<ItemEntry, 'id'> => ({
  name: '', category: 'toy', condition: 'new',
  reaction: 'likes', purchaseDate: new Date().toISOString().slice(0, 10),
  notes: '',
});

const categoryColor: Record<string, string> = {
  toy: '#e67e22', bed: '#3498db', feeder: '#27ae60',
  leash: '#9b59b6', clothing: '#e91e63', cage: '#1abc9c', other: '#95a5a6',
};

export function ItemsModule({ petId }: { petId: string }) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<ItemEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadModuleData<ItemEntry>(petId, 'items').then(setEntries); }, [petId]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setPreview(url);
      setForm(p => ({ ...p, _photo: url.split(',')[1] }));
    };
    reader.readAsDataURL(file);
  };

  const handleEdit = (entry: ItemEntry) => {
    const { id, ...rest } = entry;
    setForm(rest);
    setPreview(entry._photo ? `data:image/jpeg;base64,${entry._photo}` : null);
    setEditingId(id);
    setShowForm(true);
  };

  const handleClose = () => { setShowForm(false); setForm(empty()); setPreview(null); setEditingId(null); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    let updated: ItemEntry[];
    if (editingId) {
      updated = entries.map(e => e.id === editingId ? { id: editingId, ...form } : e);
    } else {
      updated = [{ id: crypto.randomUUID(), ...form }, ...entries];
    }
    setEntries(updated);
    await saveModuleData(petId, 'items', updated);
    handleClose();
  };

  const handleDelete = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    await saveModuleData(petId, 'items', updated);
  };

  const categoryLabel: Record<string, string> = {
    toy: t('items.catToy'), bed: t('items.catBed'), feeder: t('items.catFeeder'),
    leash: t('items.catLeash'), clothing: t('items.catClothing'), cage: t('items.catCage'), other: t('items.catOther'),
  };
  const conditionLabel: Record<string, string> = {
    new: t('items.condNew'), used: t('items.condUsed'), worn: t('items.condWorn'),
  };
  const reactionLabel: Record<string, string> = {
    loves: t('items.reactLoves'), likes: t('items.reactLikes'),
    ignores: t('items.reactIgnores'), afraid: t('items.reactAfraid'),
  };

  return (
    <>
      <button className="module-add-btn" onClick={() => setShowForm(true)}>
        <Plus size={14} /> {t('items.addBtn')}
      </button>

      {entries.length === 0 ? <EmptyState label={t('modules.items.label')} /> : (
        <div className="module-list">
          {entries.map(e => (
            <RecordCard key={e.id} date={e.purchaseDate}
              badge={categoryLabel[e.category]} badgeColor={categoryColor[e.category]}
              title={e.name}
              photo={e._photo}
              fields={[
                { label: t('items.fieldCondition'), value: e.condition ? conditionLabel[e.condition] : undefined },
                { label: t('items.fieldReaction'), value: e.reaction ? reactionLabel[e.reaction] : undefined },
                { label: t('items.fieldNotes'), value: e.notes },
              ]}
              onEdit={() => handleEdit(e)}
              onDelete={() => handleDelete(e.id)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <FormSheet title={editingId ? t('items.formTitleEdit') : t('items.formTitleNew')} onClose={handleClose} onSave={handleSave}>
          <Field label={t('items.nameLabel')}><Input placeholder={t('items.namePlaceholder')} value={form.name} onChange={set('name')} /></Field>
          <Field label={t('items.categoryLabel')}>
            <Select value={form.category} onChange={set('category')}>
              <option value="toy">{t('items.catToyFull')}</option>
              <option value="bed">{t('items.catBedFull')}</option>
              <option value="feeder">{t('items.catFeederFull')}</option>
              <option value="leash">{t('items.catLeashFull')}</option>
              <option value="clothing">{t('items.catClothingFull')}</option>
              <option value="cage">{t('items.catCageFull')}</option>
              <option value="other">{t('items.catOtherFull')}</option>
            </Select>
          </Field>
          <Field label={t('items.reactionLabel')}>
            <Select value={form.reaction ?? 'likes'} onChange={set('reaction')}>
              <option value="loves">{t('items.reactLoves')}</option>
              <option value="likes">{t('items.reactLikes')}</option>
              <option value="ignores">{t('items.reactIgnores')}</option>
              <option value="afraid">{t('items.reactAfraid')}</option>
            </Select>
          </Field>
          <Field label={t('items.conditionLabel')}>
            <Select value={form.condition ?? 'new'} onChange={set('condition')}>
              <option value="new">{t('items.condNew')}</option>
              <option value="used">{t('items.condUsed')}</option>
              <option value="worn">{t('items.condWorn')}</option>
            </Select>
          </Field>
          <Field label={t('items.purchaseDateLabel')}><Input type="date" value={form.purchaseDate ?? ''} onChange={set('purchaseDate')} /></Field>
          <Field label={t('items.notesLabel')}><Input placeholder={t('items.notesPlaceholder')} value={form.notes ?? ''} onChange={set('notes')} /></Field>
          <Field label={t('items.photoLabel')}>
            <div className="photo-upload-small" onClick={() => fileRef.current?.click()} style={{ cursor: 'pointer' }}>
              {preview
                ? <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 6 }} />
                : <span style={{ color: 'var(--ink-faded)', fontSize: 13 }}>{t('items.addPhotoHint')}</span>
              }
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} hidden />
            </div>
          </Field>
        </FormSheet>
      )}
    </>
  );
}
