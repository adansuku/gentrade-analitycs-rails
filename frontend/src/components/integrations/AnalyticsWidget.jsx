/**
 * AnalyticsWidget — GA4 metrics display
 * Shows sessions, users, bounce rate, conversions with deltas
 */

import { useState, useEffect } from 'react';
import { authFetch } from '../../lib/api';
import { API_BASE } from '../../lib/constants';
import { Icons } from '../ui/Icons';

function MetricBox({ label, value, delta, format = 'number' }) {
  const formatted = format === 'percent'
    ? `${(value * 100).toFixed(1)}%`
    : format === 'duration'
    ? `${Math.floor(value / 60)}m ${Math.floor(value % 60)}s`
    : value?.toLocaleString?.() ?? '0';

  const deltaFormatted = delta != null ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%` : null;
  const isPositive = delta > 0;
  const isNegative = delta < 0;
  // For bounce rate, negative delta is good
  const isBounce = label.toLowerCase().includes('rebote');
  const deltaColor = isBounce
    ? (isNegative ? '#059669' : isPositive ? '#dc2626' : '#6b7280')
    : (isPositive ? '#059669' : isNegative ? '#dc2626' : '#6b7280');

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
          {formatted}
        </span>
        {deltaFormatted && (
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: deltaColor }}>
            {deltaFormatted}
          </span>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsWidget({ clientId, integrationId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const r = await authFetch(`${API_BASE}/api/integrations/client/${clientId}/${integrationId}/data?category=metrics`);
        const result = await r.json();
        // Get the last_30d metrics
        const metrics30d = (result.data || []).find(d => d.period === 'last_30d');
        if (metrics30d?.data) setData(metrics30d.data);
      } catch (err) {
        console.error('Error loading analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [clientId, integrationId]);

  if (loading) {
    return (
      <div style={{
        background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
        padding: 24, textAlign: 'center', color: '#9ca3af',
      }}>
        Cargando metricas...
      </div>
    );
  }

  if (!data) return null;

  const { current, deltas } = data;

  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid #f0f1f5',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#4285F412', color: '#4285F4',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icons.BarChart />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Google Analytics</div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Ultimos 30 dias</div>
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 0, padding: '0 20px',
      }}>
        <MetricBox label="Sesiones" value={current?.sessions} delta={deltas?.sessions} />
        <MetricBox label="Usuarios" value={current?.users} delta={deltas?.users} />
        <MetricBox label="Tasa de rebote" value={current?.bounceRate} delta={deltas?.bounceRate} format="percent" />
        <MetricBox label="Conversiones" value={current?.conversions} delta={deltas?.conversions} />
      </div>
    </div>
  );
}
