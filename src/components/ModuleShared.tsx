import { useState } from 'react';
import { Bell, Trash2, ChevronDown, Camera, Pencil } from 'lucide-react';

// ── Empty state ───────────────────────────────────────────────
export function EmptyState({ label }: { label: string }) {
  return (
    <div className="module-empty">
      <p>Записей в разделе «{label}» пока нет</p>
      <p className="module-empty-hint">Напишите что-нибудь внизу</p>
    </div>
  );
}

// ── Record card ───────────────────────────────────────────────
interface RecordCardProps {
  date?: string;
  badge?: string;
  badgeColor?: string;
  title: string;
  fields: { label: string; value: string | undefined }[];
  notify?: boolean;
  photo?: string;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function RecordCard({ date, badge, badgeColor, title, fields, notify, photo, onDelete, onEdit }: RecordCardProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleFields = fields.filter(f => f.value);

  return (
    <div className={`record-card ${expanded ? 'record-card--expanded' : ''}`}>
      <div className="record-card-header" onClick={() => setExpanded(p => !p)} style={{ cursor: 'pointer' }}>
        <div className="record-card-meta">
          {date && <span className="record-date font-typewriter">{formatDate(date)}</span>}
          {badge && (
            <span className="record-badge" style={{ borderColor: badgeColor, color: badgeColor }}>
              {badge}
            </span>
          )}
        </div>
        <div className="record-card-actions">
          {notify && <Bell size={12} className="record-notify-icon" />}
          {photo && <Camera size={12} className="record-photo-icon" />}
          {(visibleFields.length > 0 || !!photo) && (
            <ChevronDown size={14} className={`record-chevron ${expanded ? 'record-chevron--open' : ''}`} />
          )}
          {onEdit && (
            <button className="record-edit-btn" onClick={e => { e.stopPropagation(); onEdit(); }}>
              <Pencil size={12} />
            </button>
          )}
          {onDelete && (
            <button className="record-delete-btn" onClick={e => { e.stopPropagation(); onDelete(); }}>
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      <p className="record-title">{title}</p>

      {expanded && (visibleFields.length > 0 || photo) && (
        <div className="record-fields">
          {visibleFields.map(f => (
            <div key={f.label} className="record-field">
              <span className="record-field-label">{f.label}:</span>
              <span className="record-field-value">{f.value}</span>
            </div>
          ))}
          {photo && (
            <img
              src={`data:image/jpeg;base64,${photo}`}
              alt="фото"
              className="record-photo"
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Severity badge ────────────────────────────────────────────
export function severityLabel(s: 'mild' | 'moderate' | 'severe') {
  return { mild: 'Лёгкая', moderate: 'Средняя', severe: 'Тяжёлая' }[s];
}

export function severityColor(s: 'mild' | 'moderate' | 'severe') {
  return { mild: '#27ae60', moderate: '#e67e22', severe: '#e74c3c' }[s];
}

// ── Date format ───────────────────────────────────────────────
export function formatDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}
