import { useEffect } from 'react';
import { X } from 'lucide-react';
import { PawLoader } from './PawLoader';
import { useTranslation } from 'react-i18next';

interface FormSheetProps {
  title: string;
  onClose: () => void;
  onSave: () => void;
  children: React.ReactNode;
  saveLabel?: string;
  saving?: boolean;
}

export function FormSheet({ title, onClose, onSave, children, saveLabel, saving = false }: FormSheetProps) {
  const { t } = useTranslation();
  const label = saveLabel ?? t('common.save');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-card" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <h3 className="sheet-title font-typewriter">{title}</h3>
          <button className="sheet-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="sheet-body scrollable">{children}</div>
        <div className="sheet-footer">
          <button className="sheet-save-btn font-typewriter" onClick={onSave} disabled={saving}>{label}</button>
        </div>
        {saving && <PawLoader overlay text={t('common.saving')} />}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field-group">
      <label className="field-label font-typewriter">{label}</label>
      {children}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="field-input" {...props} />;
}

export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <div className="select-wrapper">
      <select className="field-input" {...props}>{children}</select>
    </div>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="toggle-row">
      <span className="toggle-label">{label}</span>
      <button
        className={`toggle-btn ${checked ? 'toggle-btn--on' : ''}`}
        onClick={() => onChange(!checked)}
        type="button"
      >
        <span className="toggle-thumb" />
      </button>
    </div>
  );
}
