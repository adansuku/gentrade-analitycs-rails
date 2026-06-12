import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../../lib/api';
import { API_BASE } from '../../lib/constants';
import tokens from './workspace/tokens';
import { Icons } from '../ui/Icons';

const statusLabels = {
  connected: { label: 'Conectado', color: '#16a34a' },
  disconnected: { label: 'Desconectado', color: tokens.inkMuted },
  error: { label: 'Error', color: '#dc2626' },
};

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ background: tokens.surface, borderRadius: tokens.radius.lg, padding: tokens.space[6], width: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <p style={{ margin: 0, fontSize: 14, color: tokens.ink, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: tokens.space[2], marginTop: tokens.space[5], justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: `${tokens.space[2]}px ${tokens.space[4]}px`, borderRadius: tokens.radius.md, border: `1px solid ${tokens.border}`, background: tokens.surface, color: tokens.ink, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={onConfirm} style={{ padding: `${tokens.space[2]}px ${tokens.space[4]}px`, borderRadius: tokens.radius.md, border: 'none', background: '#dc2626', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}

export default function DataIngestionPanel({ clientId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const fetchData = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    authFetch(`${API_BASE}/api/clients/${clientId}/reports/ingestion`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clientId]);

  useEffect(() => fetchData(), [fetchData]);

  // Poll while any backfill is running
  useEffect(() => {
    const hasRunning = data?.integrations?.some((i) => i.backfill?.status === 'running');
    if (!hasRunning) return;
    const interval = setInterval(() => {
      authFetch(`${API_BASE}/api/clients/${clientId}/reports/ingestion`)
        .then((r) => r.json())
        .then((d) => setData(d))
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [data?.integrations?.some((i) => i.backfill?.status === 'running'), clientId]);

  const handleBackfill = async (integrationId) => {
    await authFetch(`${API_BASE}/api/clients/${clientId}/reports/ingestion/${integrationId}/backfill`, { method: 'POST' });
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget);
    try {
      await authFetch(`${API_BASE}/api/clients/${clientId}/reports/ingestion/${deleteTarget}`, { method: 'DELETE' });
      fetchData();
    } catch {}
    setDeleting(null);
    setDeleteTarget(null);
  };

  if (loading) {
    return <div style={{ padding: tokens.space[6], textAlign: 'center', color: tokens.inkMuted, fontSize: 14 }}>Cargando panel de ingesta...</div>;
  }

  const integrations = data?.integrations || [];

  if (integrations.length === 0) {
    return (
      <div style={{ padding: tokens.space[6], background: tokens.surfaceAlt, borderRadius: tokens.radius.md, border: `1px solid ${tokens.borderSoft}`, textAlign: 'center', color: tokens.inkMuted, fontSize: 14 }}>
        No hay integraciones conectadas.
      </div>
    );
  }

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${tokens.border}` }}>
            <th style={{ textAlign: 'left', padding: `${tokens.space[2]}px ${tokens.space[3]}px`, color: tokens.inkMuted, fontWeight: 500, fontSize: 12 }}>Integración</th>
            <th style={{ textAlign: 'left', padding: `${tokens.space[2]}px ${tokens.space[3]}px`, color: tokens.inkMuted, fontWeight: 500, fontSize: 12 }}>Estado</th>
            <th style={{ textAlign: 'left', padding: `${tokens.space[2]}px ${tokens.space[3]}px`, color: tokens.inkMuted, fontWeight: 500, fontSize: 12 }}>Datos</th>
            <th style={{ textAlign: 'left', padding: `${tokens.space[2]}px ${tokens.space[3]}px`, color: tokens.inkMuted, fontWeight: 500, fontSize: 12 }}>Rango</th>
            <th style={{ textAlign: 'left', padding: `${tokens.space[2]}px ${tokens.space[3]}px`, color: tokens.inkMuted, fontWeight: 500, fontSize: 12 }}>Última sync</th>
            <th style={{ textAlign: 'right', padding: `${tokens.space[2]}px ${tokens.space[3]}px`, color: tokens.inkMuted, fontWeight: 500, fontSize: 12 }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {integrations.map((integ) => {
            const st = statusLabels[integ.status] || statusLabels.disconnected;
            const isRunning = integ.backfill?.status === 'running';
            const isDeleting = deleting === integ.integrationId;

            return (
              <tr key={integ.integrationId} style={{ borderBottom: `1px solid ${tokens.borderSoft}` }}>
                <td style={{ padding: `${tokens.space[3]}px`, color: tokens.ink, fontWeight: 500 }}>{integ.type}</td>
                <td style={{ padding: `${tokens.space[3]}px` }}>
                  <span style={{ color: st.color, fontSize: 12 }}>{st.label}</span>
                  {integ.lastError && <div style={{ color: '#dc2626', fontSize: 11, marginTop: 2 }}>{integ.lastError}</div>}
                </td>
                <td style={{ padding: `${tokens.space[3]}px`, color: tokens.inkSoft }}>
                  {integ.recordCount > 0 ? `${integ.recordCount} registros` : 'Sin datos'}
                </td>
                <td style={{ padding: `${tokens.space[3]}px`, color: tokens.inkSoft, fontSize: 12 }}>
                  {integ.dateRange ? `${integ.dateRange.earliest} → ${integ.dateRange.latest}` : '–'}
                </td>
                <td style={{ padding: `${tokens.space[3]}px`, color: tokens.inkMuted, fontSize: 12 }}>
                  {integ.lastSyncAt ? new Date(integ.lastSyncAt).toLocaleString('es-ES') : 'Nunca'}
                </td>
                <td style={{ padding: `${tokens.space[3]}px`, textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: tokens.space[2], justifyContent: 'flex-end' }}>
                    {isRunning ? (
                      <span style={{ fontSize: 11, color: tokens.accent }}>Rellenando... {integ.backfill.progress}%</span>
                    ) : integ.backfill?.status === 'completed' ? (
                      <span style={{ fontSize: 11, color: '#16a34a' }}>Completado</span>
                    ) : integ.backfill?.status === 'failed' ? (
                      <span style={{ fontSize: 11, color: '#dc2626' }}>Falló</span>
                    ) : (
                      <button
                        onClick={() => handleBackfill(integ.integrationId)}
                        style={{ fontSize: 11, color: tokens.accent, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Rellenar histórico
                      </button>
                    )}
                    {integ.recordCount > 0 && (
                      <button
                        onClick={() => setDeleteTarget(integ.integrationId)}
                        disabled={isDeleting}
                        style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: isDeleting ? 'wait' : 'pointer', opacity: isDeleting ? 0.5 : 1 }}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {deleteTarget && (
        <ConfirmDialog
          message={`¿Eliminar todos los datos de esta integración? Esta acción es permanente.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
