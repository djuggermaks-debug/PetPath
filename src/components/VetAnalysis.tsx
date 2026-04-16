import type { VetAdvice } from '../ai/vetAgent';
import { useTranslation } from 'react-i18next';

interface VetAnalysisProps {
  advice: VetAdvice;
}

export function VetAnalysis({ advice }: VetAnalysisProps) {
  const { t } = useTranslation();
  const hasContent =
    advice.alerts.length > 0 ||
    advice.observations.length > 0 ||
    advice.recommendations.length > 0;

  return (
    <div className="vet-analysis">
      <div className="vet-analysis-header">
        <span className="font-typewriter">{t('vetAnalysis.title')}</span>
      </div>

      {!hasContent && (
        <p className="vet-empty">{t('vetAnalysis.empty')}</p>
      )}

      {advice.alerts.length > 0 && (
        <div className="vet-section vet-section--alert">
          <p className="vet-section-title">{t('vetAnalysis.alerts')}</p>
          {advice.alerts.map((a, i) => <p key={i} className="vet-item">{a}</p>)}
        </div>
      )}

      {advice.observations.length > 0 && (
        <div className="vet-section">
          <p className="vet-section-title">{t('vetAnalysis.observations')}</p>
          {advice.observations.map((o, i) => <p key={i} className="vet-item">{o}</p>)}
        </div>
      )}

      {advice.recommendations.length > 0 && (
        <div className="vet-section">
          <p className="vet-section-title">{t('vetAnalysis.recommendations')}</p>
          {advice.recommendations.map((r, i) => <p key={i} className="vet-item">{r}</p>)}
        </div>
      )}
    </div>
  );
}
