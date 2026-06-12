/**
 * PaymentsWidget — Stripe / payment metrics display
 * Shows revenue, MRR, churn, active subs and recent charges
 */

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
  background: '#2a7d5412', color: '#2a7d54',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const summaryGridStyle = {
  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, padding: '0 20px',
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

function fmtCurrency(v, currency = 'EUR') {
  return (v ?? 0).toLocaleString('es-ES', { style: 'currency', currency });
}

function fmtDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

const statusColors = {
  succeeded: { bg: '#ecfdf5', color: '#059669', label: 'Completado' },
  pending: { bg: '#fffbeb', color: '#d97706', label: 'Pendiente' },
  failed: { bg: '#fef2f2', color: '#dc2626', label: 'Fallido' },
  refunded: { bg: '#f0f1f5', color: '#6b7280', label: 'Reembolsado' },
};

function StatusBadge({ status }) {
  const s = statusColors[status] || statusColors.pending;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 9999,
      fontSize: '0.7rem', fontWeight: 600, background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  );
}

export default function PaymentsWidget({ data }) {
  if (!data || !data.summary) {
    return (
      <div style={{ ...cardStyle, padding: 24, textAlign: 'center', color: '#9ca3af' }}>
        Sin datos de pagos disponibles
      </div>
    );
  }

  const { summary, charges = [] } = data;

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={iconBoxStyle}><Icons.DollarSign /></div>
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Pagos</div>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Ingresos y suscripciones</div>
        </div>
      </div>

      <div style={summaryGridStyle}>
        {[
          { label: 'Ingresos totales', value: fmtCurrency(summary.totalRevenue) },
          { label: 'MRR', value: fmtCurrency(summary.mrr) },
          { label: 'Tasa de baja', value: `${((summary.churnRate ?? 0) * 100).toFixed(1)}%` },
          { label: 'Suscripciones activas', value: (summary.activeSubscriptions ?? 0).toLocaleString() },
        ].map(m => (
          <div key={m.label} style={{ padding: '16px 0' }}>
            <div style={metricLabelStyle}>{m.label}</div>
            <div style={metricValueStyle}>{m.value}</div>
          </div>
        ))}
      </div>

      {charges.length > 0 && (
        <div style={tableWrapStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
            <thead>
              <tr>
                <th style={thStyle}>Descripcion</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Importe</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {charges.map((c, i) => (
                <tr key={i}>
                  <td style={tdStyle}>{c.description || 'Cargo'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmtCurrency(c.amount)}</td>
                  <td style={tdStyle}><StatusBadge status={c.status} /></td>
                  <td style={tdStyle}>{fmtDate(c.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
