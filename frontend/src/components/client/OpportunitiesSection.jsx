import { useEffect, useMemo, useState } from 'react';
import { authFetch } from '../../lib/api';
import { API_BASE } from '../../lib/constants';
import { Icons } from '../ui/Icons';
import { buildEcommerceSignals } from '../../lib/opportunities/signals';

const card = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  overflow: 'hidden',
};

const SEVERITY = {
  info: { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', label: 'Info', icon: Icons.BarChart3 },
  warning: { bg: '#fffbeb', border: '#fde68a', color: '#b45309', label: 'Aviso', icon: Icons.AlertTriangle },
  critical: { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c', label: 'Crítico', icon: Icons.AlertTriangle },
};

function SignalCard({ signal }) {
  const s = SEVERITY[signal.severity] || SEVERITY.info;
  const Icon = s.icon;

  return (
    <div style={{
      border: `1px solid ${s.border}`,
      background: '#fff',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', gap: 12, padding: 14, alignItems: 'flex-start' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: s.bg, color: s.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>{signal.title}</div>
              {signal.subtitle && (
                <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {signal.subtitle}
                </div>
              )}
            </div>
            <span style={{
              fontSize: '0.7rem', fontWeight: 700,
              padding: '4px 10px', borderRadius: 999,
              background: s.bg, color: s.color,
              border: `1px solid ${s.border}`,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              {s.label}
            </span>
          </div>

          {signal.why && (
            <div style={{ marginTop: 8, fontSize: '0.85rem', color: '#4b5563', lineHeight: 1.5 }}>
              {signal.why}
            </div>
          )}

          {signal.evidence?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {signal.evidence.map((e, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: '0.75rem',
                    color: '#374151',
                    background: '#f8f9fb',
                    border: '1px solid #e5e7eb',
                    padding: '4px 8px',
                    borderRadius: 8,
                  }}
                >
                  <strong style={{ fontWeight: 700 }}>{e.label}:</strong> {e.value}
                </span>
              ))}
            </div>
          )}

          {signal.actions?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6b7280', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                Acciones
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {signal.actions.map((a, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ width: 18, height: 18, borderRadius: 6, background: '#eef2ff', color: '#1b5e3b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, fontSize: 12, fontWeight: 800 }}>
                      {idx + 1}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.5 }}>{a}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

async function fetchIntegrationData({ clientId, integrationId }) {
  const res = await authFetch(`${API_BASE}/api/integrations/client/${clientId}/${integrationId}/data`);
  const json = await res.json();

  // Same merge strategy as ConnectedWidgets.GroupDataLoader.
  const merged = {};
  const periods = {};
  (json.data || []).forEach(({ category, period, data }) => {
    if (!merged[category] || period > periods[category]) {
      merged[category] = data;
      periods[category] = period;
    }
  });
  return merged;
}

export function OpportunitiesSection({ clientId, connectedIntegrations = [], onCountChange }) {
  const [loading, setLoading] = useState(true);
  const [inventorySignals, setInventorySignals] = useState([]);
  const [error, setError] = useState(null);

  const ecommerceIntegrations = useMemo(
    () => connectedIntegrations.filter((i) => ['shopify', 'woocommerce', 'prestashop', 'amazon_seller', 'holded', 'csv'].includes(i.type)),
    [connectedIntegrations],
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!clientId) return;
      setLoading(true);
      setError(null);

      try {
        const all = [];

        for (const integration of ecommerceIntegrations) {
          const data = await fetchIntegrationData({ clientId, integrationId: integration.id });
          const ecommerceData = data;

          if (!ecommerceData || !ecommerceData.products) continue;

          const ecommerceSignals = buildEcommerceSignals({
            integrationType: integration.type,
            integrationLabel: integration.resource ? `${integration.label} · ${integration.resource}` : integration.label,
            ecommerceData: ecommerceData,
            config: integration.config,
          });

          all.push(...ecommerceSignals.filter(s => s.type !== 'kpi_snapshot'));
        }

        if (!cancelled) {
          setInventorySignals(all);
          onCountChange?.(all.length);
        }
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [clientId, ecommerceIntegrations]);

  const stockoutSignals = inventorySignals.filter(s => s.type === 'stockout_risk');
  const overstockSignals = inventorySignals.filter(s => s.type === 'overstock');

  return (
    <div style={card}>
      <div style={{ padding: 20, borderBottom: '1px solid #f0f1f5' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: '#eef2ff', color: '#1b5e3b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icons.Package />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#111827' }}>Inventario</div>
            <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
              Productos con problemas de stock o inventario excesivo
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>
            Analizando inventario…
          </div>
        ) : error ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>
            No se pudo analizar el inventario.
          </div>
        ) : inventorySignals.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>
            Sin problemas de inventario. Conecta Shopify (u otro e-commerce) para activar el análisis.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {stockoutSignals.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Icons.AlertTriangle style={{ color: '#f59e0b', width: 18, height: 18 }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#b45309' }}>
                    Productos sin stock o con poco stock ({stockoutSignals.length})
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {stockoutSignals.map((s) => (
                    <SignalCard key={s.id} signal={s} />
                  ))}
                </div>
              </div>
            )}

            {overstockSignals.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Icons.Box style={{ color: '#6b7280', width: 18, height: 18 }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>
                    Productos con exceso de inventario ({overstockSignals.length})
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {overstockSignals.map((s) => (
                    <SignalCard key={s.id} signal={s} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default OpportunitiesSection;
