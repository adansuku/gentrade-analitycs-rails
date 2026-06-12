import { useState, useEffect } from 'react';
import { authFetch } from '../../lib/api';
import { API_BASE } from '../../lib/constants';
import { Icons } from '../ui/Icons';

const cardStyle = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  overflow: 'hidden',
};

const RECOMMENDATION_TYPES = {
  email: { icon: Icons.Mail, color: '#1b5e3b', label: 'Email Marketing' },
  sms: { icon: Icons.MessageSquare, color: '#059669', label: 'SMS' },
  promotion: { icon: Icons.Percent, color: '#dc2626', label: 'Promoción' },
  campaign: { icon: Icons.Campaign, color: '#7c3aed', label: 'Campaña' },
  upsell: { icon: Icons.TrendingUp, color: '#f59e0b', label: 'Upselling' },
};

function RecommendationCard({ rec, onDelete, onMarkDone, onToggleFavorite }) {
  const typeInfo = RECOMMENDATION_TYPES[rec.type] || RECOMMENDATION_TYPES.campaign;
  const Icon = typeInfo.icon;
  const isFavorite = rec.status === 'favorite';
  const isDone = rec.status === 'done';

  return (
    <div style={{
      border: `1px solid ${isFavorite ? '#fbbf24' : isDone ? '#86efac' : '#e5e7eb'}`,
      background: isDone ? '#f0fdf408' : '#fff',
      borderRadius: 12,
      overflow: 'hidden',
      opacity: isDone ? 0.7 : 1,
    }}>
      <div style={{ display: 'flex', gap: 14, padding: 16, alignItems: 'flex-start' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${typeInfo.color}15`, color: typeInfo.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', textDecoration: isDone ? 'line-through' : 'none' }}>
                {rec.title}
              </div>
              {rec.product && (
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 2 }}>
                  Producto: {rec.product}
                </div>
              )}
            </div>
            <span style={{
              fontSize: '0.65rem', fontWeight: 700,
              padding: '3px 8px', borderRadius: 999,
              background: `${typeInfo.color}15`, color: typeInfo.color,
              border: `1px solid ${typeInfo.color}30`,
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {typeInfo.label}
            </span>
          </div>

          {rec.why && (
            <div style={{ marginTop: 10, fontSize: '0.85rem', color: '#4b5563', lineHeight: 1.5 }}>
              {rec.why}
            </div>
          )}

          {rec.benefit && (
            <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#059669', background: '#ecfdf5', padding: '6px 10px', borderRadius: 6 }}>
              <strong>Beneficio:</strong> {rec.benefit}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              onClick={() => onToggleFavorite(rec.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: isFavorite ? '#f59e0b' : '#d1d5db', padding: 0 }}
              title={isFavorite ? 'Quitar favorito' : 'Marcar como valiosa'}
            >
              {isFavorite ? '★' : '☆'}
            </button>
            <button
              onClick={() => onMarkDone(rec.id)}
              style={{ background: 'none', cursor: 'pointer', fontSize: 11, color: isDone ? '#16a34a' : '#9ca3af', padding: '2px 6px', borderRadius: 4, border: `1px solid ${isDone ? '#86efac' : '#e5e7eb'}` }}
            >
              {isDone ? '✓ Ejecutada' : 'Marcar ejecutada'}
            </button>
            <button
              onClick={() => onDelete(rec.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#dc2626', padding: '2px 6px', marginLeft: 'auto' }}
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MarketingActionsSection({ clientId, connectedIntegrations = [] }) {
  const [loading, setLoading] = useState(false);
  const [marketingActions, setMarketingActions] = useState([]);
  const [error, setError] = useState(null);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const ecommerceIntegrations = connectedIntegrations.filter(
    (i) => ['shopify', 'woocommerce', 'prestashop', 'amazon_seller', 'holded', 'csv'].includes(i.type)
  );

  // Load persisted recommendations on mount
  useEffect(() => {
    if (!clientId || initialLoaded) return;
    authFetch(`${API_BASE}/api/insights/recommendations/${clientId}`)
      .then((r) => r.json())
      .then((data) => {
        const recs = data.recommendations || [];
        if (recs.length > 0) {
          setMarketingActions(recs.map((rec) => ({
            id: rec.id,
            type: rec.type || rec.category || 'email',
            title: rec.title,
            product: rec.product || null,
            why: rec.description || null,
            benefit: rec.benefit || null,
            targetAudience: rec.targetSegment || null,
            relevance: rec.priority || 75,
            status: rec.status,
          })));
        }
        setInitialLoaded(true);
      })
      .catch(() => setInitialLoaded(true));
  }, [clientId]);

  const handleDelete = async (id) => {
    try {
      await authFetch(`${API_BASE}/api/insights/recommendations/${id}`, { method: 'DELETE' });
      setMarketingActions((prev) => prev.filter((a) => a.id !== id));
    } catch {}
  };

  const handleMarkDone = async (id) => {
    const action = marketingActions.find((a) => a.id === id);
    const newStatus = action?.status === 'done' ? 'active' : 'done';
    try {
      await authFetch(`${API_BASE}/api/insights/recommendations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setMarketingActions((prev) => prev.map((a) => a.id === id ? { ...a, status: newStatus } : a));
    } catch {}
  };

  const handleToggleFavorite = async (id) => {
    const action = marketingActions.find((a) => a.id === id);
    const newStatus = action?.status === 'favorite' ? 'active' : 'favorite';
    try {
      await authFetch(`${API_BASE}/api/insights/recommendations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setMarketingActions((prev) => prev.map((a) => a.id === id ? { ...a, status: newStatus } : a));
    } catch {}
  };

  const generateActions = async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);

    try {
      const r = await authFetch(`${API_BASE}/api/insights/recommendations/${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await r.json();
      const recommendations = data.recommendations || [];

      const actions = recommendations.map((rec) => {
        const relevance = rec.relevance || rec.score || 75;
        const type = rec.type || 'email';

        return {
          id: rec.id || `rec-${Math.random()}`,
          type,
          title: rec.title || rec.name || 'Recomendación',
          product: rec.productName || rec.product || null,
          why: rec.why || rec.description || rec.porQue || null,
          benefit: rec.benefit || rec.expectedImpact || null,
          targetAudience: rec.targetSegment || null,
          relevance,
        };
      });

      // Preserve favorites — merge new recommendations with existing favorites
      const favorites = marketingActions.filter((a) => a.status === 'favorite');
      const favoriteIds = new Set(favorites.map((a) => a.title));
      const newActions = actions.filter((a) => !favoriteIds.has(a.title));
      setMarketingActions([...favorites, ...newActions]);
    } catch (e) {
      setError(e.message || 'Error al generar recomendaciones');
    } finally {
      setLoading(false);
    }
  };

  const hasEcommerce = ecommerceIntegrations.length > 0;

  return (
    <div style={cardStyle}>
      <div style={{ padding: 20, borderBottom: '1px solid #f0f1f5' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: '#eef2ff', color: '#1b5e3b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icons.Bullhorn />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#111827' }}>Acciones de Marketing</div>
            <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
              Recomendaciones IA basadas en ventas, inventario y comportamiento del cliente
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {!hasEcommerce && (
          <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem', background: '#f9fafb', borderRadius: 8 }}>
            Conecta Shopify (u otro e-commerce) para recibir recomendaciones personalizadas.
          </div>
        )}

        {hasEcommerce && marketingActions.length === 0 && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
              <Icons.Sparkles />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#374151' }}>
                ¿Qué acción de marketing te recomiendo?
              </div>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: 4 }}>
                Analiza tu historial de ventas e inventario para sugerir la mejor acción.
              </div>
            </div>
            <button
              onClick={generateActions}
              disabled={loading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#1b5e3b', color: '#fff', border: 'none',
                borderRadius: 8, padding: '10px 20px',
                fontSize: '0.875rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              <Icons.Sparkles />
              {loading ? 'Analizando...' : 'Generar recomendaciones'}
            </button>
          </div>
        )}

        {loading && (
          <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Icons.Loader2 style={{ animation: 'spin 1s linear infinite' }} />
              Analizando datos del cliente…
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding: 16, textAlign: 'center', color: '#dc2626', fontSize: '0.85rem', background: '#fef2f2', borderRadius: 8 }}>
            {error}
          </div>
        )}

        {marketingActions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                {marketingActions.length} recomendación{marketingActions.length !== 1 ? 's' : ''} encontrada{marketingActions.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={generateActions}
                disabled={loading}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: 'none', border: 'none',
                  fontSize: '0.75rem', color: '#6b7280', cursor: 'pointer', textDecoration: 'underline',
                }}
              >
                <Icons.RefreshCw />
                Actualizar
              </button>
            </div>
            {marketingActions.map((action) => (
              <RecommendationCard
                key={action.id}
                rec={action}
                onDelete={handleDelete}
                onMarkDone={handleMarkDone}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default MarketingActionsSection;