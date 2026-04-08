import { X } from 'lucide-react';
import type { VetAdvice } from '../ai/vetAgent';

interface VetAnalysisProps {
  advice: VetAdvice;
  onClose: () => void;
}

export function VetAnalysis({ advice, onClose }: VetAnalysisProps) {
  const hasContent =
    advice.alerts.length > 0 ||
    advice.observations.length > 0 ||
    advice.recommendations.length > 0;

  return (
    <div className="vet-analysis">
      <div className="vet-analysis-header">
        <span className="font-typewriter">🩺 Анализ ветеринара</span>
        <button onClick={onClose}><X size={16} /></button>
      </div>

      {!hasContent && (
        <p className="vet-empty">Недостаточно данных для анализа. Добавьте больше записей.</p>
      )}

      {advice.alerts.length > 0 && (
        <div className="vet-section vet-section--alert">
          <p className="vet-section-title">⚠️ Требует внимания</p>
          {advice.alerts.map((a, i) => <p key={i} className="vet-item">{a}</p>)}
        </div>
      )}

      {advice.observations.length > 0 && (
        <div className="vet-section">
          <p className="vet-section-title">👁 Наблюдения</p>
          {advice.observations.map((o, i) => <p key={i} className="vet-item">{o}</p>)}
        </div>
      )}

      {advice.recommendations.length > 0 && (
        <div className="vet-section">
          <p className="vet-section-title">💡 Рекомендации</p>
          {advice.recommendations.map((r, i) => <p key={i} className="vet-item">{r}</p>)}
        </div>
      )}
    </div>
  );
}
