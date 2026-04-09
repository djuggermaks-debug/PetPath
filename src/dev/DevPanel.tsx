import { useState } from 'react';
import { devLogger, type LogEntry } from './logger';
import { Trash2, Copy, ChevronDown, ChevronUp } from 'lucide-react';

export function DevPanel() {
  const [expanded, setExpanded] = useState(true);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [copied, setCopied] = useState(false);

  // Refresh log entries
  const refresh = () => setEntries(devLogger.getEntries());

  // Called from outside to trigger re-render
  (window as any).__devRefresh = refresh;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(devLogger.toText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    devLogger.clear();
    setEntries([]);
  };

  const typeColor: Record<string, string> = {
    generate: '#3498db',
    parse: '#e67e22',
    save: '#27ae60',
    error: '#e74c3c',
    analyze: '#9b59b6',
  };

  return (
    <div className="dev-panel">
      <div className="dev-panel-header" onClick={() => setExpanded(p => !p)}>
        <span className="dev-panel-title">⚡ DEV LOG ({entries.length})</span>
        <div className="dev-panel-actions" onClick={e => e.stopPropagation()}>
          <button onClick={handleCopy} title="Скопировать лог">
            {copied ? '✓' : <Copy size={12} />}
          </button>
          <button onClick={handleClear} title="Очистить">
            <Trash2 size={12} />
          </button>
          <button onClick={() => setExpanded(p => !p)}>
            {expanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="dev-panel-body scrollable">
          {entries.length === 0 && (
            <p className="dev-empty">Лог пуст. Введи или сгенерируй сообщение.</p>
          )}
          {entries.map((e, i) => (
            <div key={i} className="dev-entry">
              <div className="dev-entry-header">
                <span className="dev-entry-time">{e.timestamp}</span>
                <span className="dev-entry-type" style={{ color: typeColor[e.type] }}>
                  {e.type.toUpperCase()}
                </span>
                <span className="dev-entry-label">{e.label}</span>
              </div>
              <pre className="dev-entry-data">{JSON.stringify(e.data, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
