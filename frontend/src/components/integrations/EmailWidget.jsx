/**
 * EmailWidget — Email marketing metrics display
 * Shows subscribers, open/click rates, campaigns with color-coded performance
 */

import { Icons } from '../ui/Icons';

const cardStyle = {
  background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden',
};
const headerStyle = {
  padding: '16px 20px', borderBottom: '1px solid #f0f1f5',
  display: 'flex', alignItems: 'center', gap: 10,
};
const gridStyle = {
  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, padding: '0 20px',
};
const tableWrap = {
  overflowX: 'auto', padding: '0 20px 16px',
};
const th = {
  fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', textAlign: 'left',
  padding: '8px 12px', borderBottom: '1px solid #f0f1f5', whiteSpace: 'nowrap',
};
const td = {
  fontSize: '0.8rem', color: '#374151', padding: '8px 12px',
  borderBottom: '1px solid #f9fafb', whiteSpace: 'nowrap',
};

function rateColor(rate) {
  if (rate >= 20) return '#059669';
  if (rate >= 10) return '#d97706';
  return '#dc2626';
}

function MetricCard({ label, value }) {
  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  );
}

export default function EmailWidget({ data }) {
  if (!data) {
    return (
      <div style={{ ...cardStyle, padding: 32, textAlign: 'center', color: '#9ca3af' }}>
        <Icons.Mail />
        <p style={{ marginTop: 8 }}>Sin datos de email marketing</p>
      </div>
    );
  }

  const { campaigns = [], summary = {} } = data;

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#8b5cf612', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icons.Mail />
        </div>
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Email Marketing</div>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Resumen de campanas</div>
        </div>
      </div>

      <div style={gridStyle}>
        <MetricCard label="Suscriptores" value={(summary.totalSubscribers ?? 0).toLocaleString()} />
        <MetricCard label="Tasa apertura prom." value={`${(summary.avgOpenRate ?? 0).toFixed(1)}%`} />
        <MetricCard label="Tasa clic prom." value={`${(summary.avgClickRate ?? 0).toFixed(1)}%`} />
        <MetricCard label="Campanas enviadas" value={summary.campaignsSent ?? campaigns.length} />
      </div>

      {campaigns.length > 0 && (
        <div style={tableWrap}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
            <thead>
              <tr>
                <th style={th}>Titulo / Asunto</th>
                <th style={th}>Apertura</th>
                <th style={th}>Clics</th>
                <th style={th}>Enviados</th>
                <th style={th}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.slice(0, 10).map((c, i) => (
                <tr key={i}>
                  <td style={td}>{c.title || c.subject || '-'}</td>
                  <td style={{ ...td, color: rateColor(c.openRate), fontWeight: 600 }}>{(c.openRate ?? 0).toFixed(1)}%</td>
                  <td style={{ ...td, color: rateColor(c.clickRate), fontWeight: 600 }}>{(c.clickRate ?? 0).toFixed(1)}%</td>
                  <td style={td}>{(c.sent ?? 0).toLocaleString()}</td>
                  <td style={td}>
                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 9999, background: c.status === 'sent' ? '#d1fae5' : '#f3f4f6', color: c.status === 'sent' ? '#059669' : '#6b7280' }}>
                      {c.status === 'sent' ? 'Enviada' : c.status === 'draft' ? 'Borrador' : c.status || '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
