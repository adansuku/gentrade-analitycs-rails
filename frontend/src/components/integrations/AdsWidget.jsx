/**
 * AdsWidget — Google Ads / Meta Ads campaign metrics display
 * Shows total spend, avg ROAS, conversions and campaign breakdown
 */

import { useState } from 'react';
import { Icons } from '../ui/Icons';

const cardStyle = {
  background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden',
};

const headerStyle = {
  padding: '16px 20px', borderBottom: '1px solid #f0f1f5',
  display: 'flex', alignItems: 'center', gap: 10,
};

const iconBoxStyle = {
  width: 32, height: 32, borderRadius: 8,
  background: '#f59e0b12', color: '#f59e0b',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const summaryGridStyle = {
  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, padding: '0 20px',
};

const metricLabelStyle = { fontSize: '0.75rem', color: '#6b7280', fontWeight: 500, marginBottom: 4 };

const metricValueStyle = {
  fontSize: '1.5rem', fontWeight: 700, color: '#111827',
  letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums',
};

const tableWrapStyle = { overflowX: 'auto', padding: '0 20px 16px' };

const thStyle = {
  padding: '8px 12px', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280',
  textAlign: 'left', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '8px 12px', fontSize: '0.8125rem', color: '#374151',
  borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap',
};

function roasColor(roas) {
  if (roas < 1) return '#dc2626';
  if (roas <= 2) return '#d97706';
  return '#059669';
}

function fmtCurrency(v) {
  return (v ?? 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

export default function AdsWidget({ data }) {
  if (!data || !data.summary) {
    return (
      <div style={{ ...cardStyle, padding: 24, textAlign: 'center', color: '#9ca3af' }}>
        Sin datos de campanas publicitarias
      </div>
    );
  }

  const { summary, campaigns = [] } = data;
  const [expanded, setExpanded] = useState(false);
  const sorted = [...campaigns].sort((a, b) => (b.spend || 0) - (a.spend || 0));
  const visible = expanded ? sorted : sorted.slice(0, 10);
  const hasMore = sorted.length > 10;

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={iconBoxStyle}><Icons.Zap /></div>
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Campanas publicitarias</div>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Google Ads / Meta Ads</div>
        </div>
      </div>

      <div style={summaryGridStyle}>
        {[
          { label: 'Gasto total', value: fmtCurrency(summary.totalSpend) },
          { label: 'ROAS medio', value: (summary.avgRoas ?? 0).toFixed(2) },
          { label: 'Conversiones', value: (summary.totalConversions ?? 0).toLocaleString() },
        ].map(m => (
          <div key={m.label} style={{ padding: '16px 0' }}>
            <div style={metricLabelStyle}>{m.label}</div>
            <div style={metricValueStyle}>{m.value}</div>
          </div>
        ))}
      </div>

      {campaigns.length > 0 && (
        <div style={tableWrapStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
            <thead>
              <tr>
                <th style={thStyle}>Campana</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Gasto</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Clics</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Conversiones</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>ROAS</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c, i) => (
                <tr key={i}>
                  <td style={tdStyle}>{c.name}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtCurrency(c.spend)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{(c.clicks ?? 0).toLocaleString()}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{(c.conversions ?? 0).toLocaleString()}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: roasColor(c.roas ?? 0) }}>
                    {(c.roas ?? 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasMore && (
            <button onClick={() => setExpanded(!expanded)} style={{ marginTop: 8, fontSize: '0.75rem', color: '#1b5e3b', background: 'none', border: 'none', cursor: 'pointer' }}>
              {expanded ? 'Mostrar menos' : `Ver las ${sorted.length - 10} campañas restantes`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
