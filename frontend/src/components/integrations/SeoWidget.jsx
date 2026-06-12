/**
 * SeoWidget — Search Console / SEO metrics display
 * Shows clicks, impressions, CTR, position and top queries/pages
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
  background: '#10b98112', color: '#10b981',
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

const sectionTitleStyle = {
  fontSize: '0.8125rem', fontWeight: 600, color: '#374151',
  padding: '12px 20px 4px',
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

function truncateUrl(url, max = 50) {
  if (!url) return '';
  return url.length > max ? url.slice(0, max) + '...' : url;
}

export default function SeoWidget({ data }) {
  if (!data || !data.summary) {
    return (
      <div style={{ ...cardStyle, padding: 24, textAlign: 'center', color: '#9ca3af' }}>
        Sin datos de SEO disponibles
      </div>
    );
  }

  const { summary, queries = [], pages = [] } = data;

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={iconBoxStyle}><Icons.Search /></div>
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>SEO / Search Console</div>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Rendimiento de busqueda</div>
        </div>
      </div>

      <div style={summaryGridStyle}>
        {[
          { label: 'Clics totales', value: (summary.totalClicks ?? 0).toLocaleString() },
          { label: 'Impresiones', value: (summary.totalImpressions ?? 0).toLocaleString() },
          { label: 'CTR medio', value: `${((summary.avgCtr ?? 0) * 100).toFixed(1)}%` },
          { label: 'Posicion media', value: (summary.avgPosition ?? 0).toFixed(1) },
        ].map(m => (
          <div key={m.label} style={{ padding: '16px 0' }}>
            <div style={metricLabelStyle}>{m.label}</div>
            <div style={metricValueStyle}>{m.value}</div>
          </div>
        ))}
      </div>

      {queries.length > 0 && (
        <>
          <div style={sectionTitleStyle}>Consultas principales</div>
          <div style={tableWrapStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Consulta</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Clics</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Impresiones</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>CTR</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Posicion</th>
                </tr>
              </thead>
              <tbody>
                {queries.map((q, i) => (
                  <tr key={i}>
                    <td style={tdStyle}>{q.query}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{(q.clicks ?? 0).toLocaleString()}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{(q.impressions ?? 0).toLocaleString()}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{((q.ctr ?? 0) * 100).toFixed(1)}%</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{(q.position ?? 0).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {pages.length > 0 && (
        <>
          <div style={sectionTitleStyle}>Paginas principales</div>
          <div style={tableWrapStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Pagina</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Clics</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Impresiones</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>CTR</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((p, i) => (
                  <tr key={i}>
                    <td style={{ ...tdStyle, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}
                        title={p.page}>{truncateUrl(p.page)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{(p.clicks ?? 0).toLocaleString()}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{(p.impressions ?? 0).toLocaleString()}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{((p.ctr ?? 0) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
