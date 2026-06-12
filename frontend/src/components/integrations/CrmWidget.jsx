/**
 * CrmWidget — CRM pipeline and deals display
 * Shows deals summary, pipeline visualization, and deals table
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
const tableWrap = { overflowX: 'auto', padding: '0 20px 16px' };
const th = {
  fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', textAlign: 'left',
  padding: '8px 12px', borderBottom: '1px solid #f0f1f5', whiteSpace: 'nowrap',
};
const td = {
  fontSize: '0.8rem', color: '#374151', padding: '8px 12px',
  borderBottom: '1px solid #f9fafb', whiteSpace: 'nowrap',
};

const STAGE_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#2a7d54', '#ec4899'];

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

function fmt(n) {
  return (n ?? 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

export default function CrmWidget({ data }) {
  if (!data) {
    return (
      <div style={{ ...cardStyle, padding: 32, textAlign: 'center', color: '#9ca3af' }}>
        <Icons.Users />
        <p style={{ marginTop: 8 }}>Sin datos de CRM</p>
      </div>
    );
  }

  const { deals = [], pipeline = {}, summary = {} } = data;
  const stages = pipeline.stages || [];
  const totalInPipeline = stages.reduce((s, st) => s + (st.count || 0), 0) || 1;

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#3b82f612', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icons.Users />
        </div>
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>CRM</div>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Pipeline y oportunidades</div>
        </div>
      </div>

      <div style={gridStyle}>
        <MetricCard label="Total oportunidades" value={summary.totalDeals ?? deals.length} />
        <MetricCard label="Valor ganado" value={fmt(summary.wonValue)} />
        <MetricCard label="Contactos" value={(summary.totalContacts ?? 0).toLocaleString()} />
        <MetricCard label="Ingresos totales" value={fmt(summary.totalRevenue)} />
      </div>

      {stages.length > 0 && (
        <div style={{ padding: '8px 20px 16px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>Pipeline</div>
          <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', height: 24 }}>
            {stages.map((st, i) => (
              <div
                key={i}
                title={`${st.name}: ${st.count}`}
                style={{
                  width: `${(st.count / totalInPipeline) * 100}%`,
                  background: STAGE_COLORS[i % STAGE_COLORS.length],
                  minWidth: st.count > 0 ? 4 : 0,
                  transition: 'width 0.3s',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 6 }}>
            {stages.map((st, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: '#6b7280' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: STAGE_COLORS[i % STAGE_COLORS.length] }} />
                {st.name} ({st.count})
              </div>
            ))}
          </div>
        </div>
      )}

      {deals.length > 0 && (
        <div style={tableWrap}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4 }}>
            <thead>
              <tr>
                <th style={th}>Nombre</th>
                <th style={th}>Etapa</th>
                <th style={th}>Monto</th>
                <th style={th}>Fecha cierre</th>
              </tr>
            </thead>
            <tbody>
              {deals.slice(0, 10).map((d, i) => (
                <tr key={i}>
                  <td style={td}>{d.name || '-'}</td>
                  <td style={td}>
                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 9999, background: '#ede9fe', color: '#7c3aed' }}>
                      {d.stage || '-'}
                    </span>
                  </td>
                  <td style={{ ...td, fontWeight: 600 }}>{fmt(d.amount)}</td>
                  <td style={td}>{d.closeDate ? new Date(d.closeDate).toLocaleDateString('es-ES') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
