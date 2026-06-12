import { useEffect, useState, useCallback } from 'react';
import { authFetch } from '../../lib/api';
import { API_BASE } from '../../lib/constants';
import { Icons } from '../ui/Icons';

function RecommendationCard({ rec, onDelete }) {
  const meta = rec.metadata || {};
  const benefit = meta.expectedBenefit;
  const basedOn = meta.basedOn;

  return (
    <div style={{
      position: 'relative',
      background: '#f8f9fb', borderRadius: 10, padding: 16,
      border: '1px solid #e5e7eb',
    }}>
      <button
        onClick={() => onDelete(rec.id)}
        title="Eliminar recomendación"
        style={{
          position: 'absolute', top: 8, right: 8,
          width: 24, height: 24, borderRadius: 6, border: 'none',
          background: 'transparent', color: '#9ca3af', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem', lineHeight: 1,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
      >
        ×
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingRight: 28 }}>
        <strong style={{ fontSize: '0.875rem', color: '#111827' }}>{rec.title}</strong>
        {rec.priority > 0 && (
          <span style={{
            background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 4,
            fontSize: '0.6875rem', fontWeight: 600,
          }}>
            {rec.priority >= 10 ? `${rec.priority}%` : `Relevancia: ${Math.round(rec.priority * 10)}%`}
          </span>
        )}
      </div>
      {rec.description && (
        <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '0 0 6px', lineHeight: 1.5 }}>
          <strong>Por qué:</strong> {rec.description}
        </p>
      )}
      {benefit && (
        <p style={{ fontSize: '0.8125rem', color: '#059669', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 4, lineHeight: 1.5 }}>
          <Icons.TrendingUp /> <strong>Beneficio:</strong> {benefit}
        </p>
      )}
      {basedOn && (
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0, lineHeight: 1.5 }}>
          Basado en: {basedOn}
        </p>
      )}
    </div>
  );
}

export function RecommendationsPanel({ clientId, variant = 'full', max, materialsCount = 0, cooldownMs = 30000 }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const r = await authFetch(`${API_BASE}/api/insights/recommendations/${clientId}`);
      const data = await r.json();
      setItems(Array.isArray(data.recommendations) ? data.recommendations : []);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async () => {
    if (!clientId || generating) return;
    setGenerating(true);
    try {
      const r = await authFetch(`${API_BASE}/api/insights/recommendations/${clientId}/generate`, { method: 'POST' });
      const data = await r.json();
      setItems(Array.isArray(data.recommendations) ? data.recommendations : []);
      setCooldownUntil(Date.now() + cooldownMs);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id) => {
    const prev = items;
    setItems(prev.filter(r => r.id !== id));
    try {
      await authFetch(`${API_BASE}/api/insights/recommendations/${id}`, { method: 'DELETE' });
    } catch (e) {
      setItems(prev);
      console.error('Delete failed:', e);
    }
  };

  const onCooldown = Date.now() < cooldownUntil;
  const disabled = generating || onCooldown || materialsCount === 0;
  const visibleItems = typeof max === 'number' ? items.slice(0, max) : items;
  const truncated = typeof max === 'number' && items.length > max;

  const btnLabel = generating
    ? 'Analizando...'
    : onCooldown
      ? 'Espera…'
      : items.length > 0 ? 'Generar más' : 'Generar recomendaciones';

  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid #f0f1f5', gap: 16, flexWrap: 'wrap',
      }}>
        <div>
          <strong style={{ fontSize: '0.9375rem', color: '#111827', display: 'block', marginBottom: 2 }}>
            Recomendaciones IA {items.length > 0 && <span style={{ color: '#9ca3af', fontWeight: 500 }}>({items.length})</span>}
          </strong>
          <span style={{ fontSize: '0.8125rem', color: '#9ca3af', lineHeight: 1.4 }}>
            {variant === 'compact'
              ? 'Top sugerencias de venta cruzada basadas en los datos del cliente.'
              : 'La IA analiza materiales, compras y preferencias para sugerir oportunidades. Elimina las que no te interesen.'}
          </span>
        </div>
        <button
          onClick={handleGenerate}
          disabled={disabled}
          style={{
            background: disabled ? '#e5e7eb' : '#1b5e3b',
            color: disabled ? '#9ca3af' : '#fff',
            border: 'none', fontWeight: 600, padding: '10px 20px', fontSize: '0.875rem', borderRadius: 8,
            whiteSpace: 'nowrap', flexShrink: 0,
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          <Icons.Sparkles />
          {btnLabel}
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
          Cargando recomendaciones...
        </div>
      ) : error ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#dc2626', fontSize: '0.85rem' }}>
          {error}
        </div>
      ) : items.length > 0 ? (
        <>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16, padding: 20,
          }}>
            {visibleItems.map(rec => (
              <RecommendationCard key={rec.id} rec={rec} onDelete={handleDelete} />
            ))}
          </div>
          {truncated && (
            <div style={{ padding: '0 20px 16px', fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center' }}>
              +{items.length - max} más en la pestaña de Propuestas
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: '#9ca3af' }}>
          <div style={{ marginBottom: 8, color: '#1b5e3b' }}><Icons.Sparkles /></div>
          <p style={{ fontWeight: 600, color: '#6b7280', margin: '0 0 4px' }}>Sin recomendaciones todavía</p>
          <span style={{ fontSize: '0.8125rem' }}>
            {materialsCount === 0
              ? 'Sube materiales del cliente primero, luego pulsa "Generar recomendaciones".'
              : 'Pulsa "Generar recomendaciones". La IA sugerirá oportunidades basadas en el contexto.'}
          </span>
        </div>
      )}
    </div>
  );
}

export default RecommendationsPanel;
