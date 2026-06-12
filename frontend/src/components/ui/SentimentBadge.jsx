export function SentimentBadge({ score, sentiment, size = 'normal' }) {
  if (score == null && !sentiment) return null;
  const s = score != null ? score : (sentiment === 'positive' ? 0.5 : sentiment === 'negative' ? -0.5 : 0);
  const label = s > 0.2 ? 'Positivo' : s < -0.2 ? 'Negativo' : 'Neutro';
  const color = s > 0.2 ? 'var(--accent-success)' : s < -0.2 ? 'var(--accent-error)' : 'var(--accent-warning)';
  const cls = size === 'small' ? 'sentiment-badge sentiment-badge-sm' : 'sentiment-badge';
  return (
    <span className={cls} style={{ background: color + '20', color, borderColor: color }}>
      {label} ({typeof score === 'number' ? score.toFixed(2) : '?'})
    </span>
  );
}

export default SentimentBadge;
