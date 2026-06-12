import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../lib/api';
import { API_BASE } from '../lib/constants';

const paceConfig = {
  ahead: { label: 'Adelantado', color: '#16a34a', bg: '#f0fdf4' },
  'on-track': { label: 'En ritmo', color: '#ca8a04', bg: '#fefce8' },
  behind: { label: 'Retrasado', color: '#dc2626', bg: '#fef2f2' },
};

function fmt(v) {
  if (v == null) return '–';
  return v.toLocaleString('es-ES', { maximumFractionDigits: 0 });
}

function fmtEur(v) {
  if (v == null) return '–';
  return v.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
}

export default function DashboardIntelligence() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    authFetch(`${API_BASE}/api/dashboard`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
        Cargando dashboard...
      </div>
    );
  }

  const clients = data?.clients || [];
  const withIssues = clients.filter((c) => c.paceStatus === 'behind' || c.hasError);
  const healthy = clients.filter((c) => c.paceStatus !== 'behind' && !c.hasError);
  const sorted = [...withIssues, ...healthy];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1c1917', margin: 0 }}>Intelligence Dashboard</h1>
        <p style={{ fontSize: 14, color: '#78716c', margin: '4px 0 0' }}>
          {clients.length} cliente{clients.length !== 1 ? 's' : ''} · {withIssues.length > 0 ? `${withIssues.length} necesita${withIssues.length !== 1 ? 'n' : ''} atención` : 'Todo en orden'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320, 1fr))', gap: 16 }}>
        {sorted.map((client) => (
          <div
            key={client.id}
            onClick={() => navigate(`/clientes/${client.slug || client.id}`)}
            style={{
              background: '#fff',
              borderRadius: 14,
              border: `1px solid ${client.hasError ? '#fecaca' : client.paceStatus === 'behind' ? '#fecaca' : '#e7e5e4'}`,
              padding: 20,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'; }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1c1917' }}>{client.name}</div>
                {client.industry && <div style={{ fontSize: 12, color: '#a8a29e' }}>{client.industry}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {client.hasError && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', background: '#fef2f2', padding: '2px 8px', borderRadius: 6 }}>Error</span>
                )}
                {client.paceStatus && paceConfig[client.paceStatus] && (
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: paceConfig[client.paceStatus].color,
                    background: paceConfig[client.paceStatus].bg,
                    padding: '2px 8px', borderRadius: 6,
                  }}>
                    {paceConfig[client.paceStatus].label}
                  </span>
                )}
              </div>
            </div>

            {/* KPIs */}
            {client.integrationCount > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#a8a29e', marginBottom: 2 }}>Ingresos</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1c1917' }}>{fmtEur(client.kpis.revenue)}</div>
                  {client.target && (
                    <div style={{ fontSize: 11, color: '#78716c' }}>de {fmtEur(client.target)}</div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#a8a29e', marginBottom: 2 }}>Gasto Ads</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1c1917' }}>{fmtEur(client.kpis.adSpend)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#a8a29e', marginBottom: 2 }}>ROAS</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1c1917' }}>{client.kpis.roas?.toFixed(2) || '–'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#a8a29e', marginBottom: 2 }}>Sesiones</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1c1917' }}>{fmt(client.kpis.sessions)}</div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 12, color: '#a8a29e', fontSize: 13 }}>
                Sin integraciones conectadas
              </div>
            )}

            {/* Footer */}
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#a8a29e' }}>
              <span>{client.integrationCount} integración{client.integrationCount !== 1 ? 'es' : ''}</span>
              <span>{client.lastSyncAt ? `Sync: ${new Date(client.lastSyncAt).toLocaleDateString('es-ES')}` : 'Sin sync'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
