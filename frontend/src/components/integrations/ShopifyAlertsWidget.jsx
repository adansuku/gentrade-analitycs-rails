/**
 * ShopifyAlertsWidget — displays stock alerts for Shopify integrations
 * Allows marking alerts as solved/reopen
 */

import { useState, useEffect } from 'react';
import { authFetch } from '../../lib/api';
import { API_BASE } from '../../lib/constants';

const cardStyle = {
  background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden',
};
const headerStyle = {
  padding: '16px 20px', borderBottom: '1px solid #f0f1f5',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
};

const SEVERITY_STYLES = {
  critical: { bg: '#fef2f2', border: '#fecaca', color: '#dc2626', icon: '🔴' },
  warning: { bg: '#fffbeb', border: '#fde68a', color: '#d97706', icon: '🟡' },
};

const STATUS_STYLES = {
  active: { bg: '#fef2f2', color: '#dc2626', label: 'Activo' },
  solved: { bg: '#d1fae5', color: '#059669', label: 'Resuelto' },
};

function AlertItem({ alert, onSolve }) {
  const [loading, setLoading] = useState(false);
  const severity = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.warning;
  const status = STATUS_STYLES[alert.status] || STATUS_STYLES.active;

  const handleToggle = async () => {
    setLoading(true);
    const newStatus = alert.status === 'solved' ? 'active' : 'solved';
    await onSolve(alert, newStatus);
    setLoading(false);
  };

  return (
    <div style={{
      padding: '12px 16px', borderBottom: '1px solid #f0f1f5',
      background: alert.status === 'solved' ? '#f9fafb' : 'transparent',
      opacity: alert.status === 'solved' ? 0.6 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ fontSize: '1rem' }}>{severity.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827', marginBottom: 2 }}>
            {alert.productName}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 4 }}>
            {alert.variantTitle && `${alert.variantTitle} • `}
            {alert.message}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4,
              background: status.bg, color: status.color, fontWeight: 500,
            }}>
              {status.label}
            </span>
            {alert.updatedAt && (
              <span style={{ fontSize: '0.65rem', color: '#9ca3af' }}>
                {new Date(alert.updatedAt).toLocaleDateString('es-ES')}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={loading}
          style={{
            fontSize: '0.7rem', padding: '4px 8px', borderRadius: 6,
            background: alert.status === 'solved' ? '#e5e7eb' : '#10b981',
            color: alert.status === 'solved' ? '#374151' : '#fff',
            border: 'none', cursor: loading ? 'wait' : 'pointer',
            fontWeight: 500, whiteSpace: 'nowrap',
          }}
        >
          {loading ? '...' : alert.status === 'solved' ? 'Reabrir' : 'Resolver'}
        </button>
      </div>
    </div>
  );
}

function AlertConfig({ config, onSave }) {
  const [form, setForm] = useState({
    lowStockThreshold: config?.lowStockThreshold ?? 10,
    coverageDays: config?.coverageDays ?? 7,
    velocityWindowDays: config?.velocityWindowDays ?? 30,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f1f5', background: '#f9fafb' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>
        Configuración de alertas
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <div>
          <label style={{ fontSize: '0.65rem', color: '#6b7280', display: 'block', marginBottom: 2 }}>
            Stock mínimo
          </label>
          <input
            type="number"
            value={form.lowStockThreshold}
            onChange={e => setForm(prev => ({ ...prev, lowStockThreshold: parseInt(e.target.value) || 10 }))}
            style={{
              width: '100%', padding: '4px 8px', fontSize: '0.75rem',
              border: '1px solid #d1d5db', borderRadius: 6,
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: '0.65rem', color: '#6b7280', display: 'block', marginBottom: 2 }}>
            Días de cobertura
          </label>
          <input
            type="number"
            value={form.coverageDays}
            onChange={e => setForm(prev => ({ ...prev, coverageDays: parseInt(e.target.value) || 7 }))}
            style={{
              width: '100%', padding: '4px 8px', fontSize: '0.75rem',
              border: '1px solid #d1d5db', borderRadius: 6,
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: '0.65rem', color: '#6b7280', display: 'block', marginBottom: 2 }}>
            Ventana días
          </label>
          <input
            type="number"
            value={form.velocityWindowDays}
            onChange={e => setForm(prev => ({ ...prev, velocityWindowDays: parseInt(e.target.value) || 30 }))}
            style={{
              width: '100%', padding: '4px 8px', fontSize: '0.75rem',
              border: '1px solid #d1d5db', borderRadius: 6,
            }}
          />
        </div>
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          marginTop: 8, fontSize: '0.7rem', padding: '4px 12px', borderRadius: 6,
          background: '#1b5e3b', color: '#fff', border: 'none', cursor: saving ? 'wait' : 'pointer',
          fontWeight: 500,
        }}
      >
        {saving ? 'Guardando...' : 'Guardar configuración'}
      </button>
    </div>
  );
}

export default function ShopifyAlertsWidget({ clientId, integrationId, alertConfig }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [archive, setArchive] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(true);
  const [showArchive, setShowArchive] = useState(false);

  const loadAlerts = async () => {
    try {
      const r = await authFetch(`${API_BASE}/api/integrations/client/${clientId}/${integrationId}/alerts`);
      const json = await r.json();
      setAlerts(json.alerts || []);
    } catch (err) {
      console.error('Error loading alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadArchive = async () => {
    try {
      const r = await authFetch(`${API_BASE}/api/integrations/client/${clientId}/${integrationId}/alerts/archive`);
      const json = await r.json();
      setArchive(json.alerts || []);
    } catch (err) {
      console.error('Error loading archived alerts:', err);
    } finally {
      setArchiveLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
    loadArchive();
  }, [clientId, integrationId]);

  const handleSolve = async (alert, newStatus) => {
    const alertId = `${alert.productId}-${alert.variantId}-${alert.type}`;
    try {
      await authFetch(`${API_BASE}/api/integrations/client/${clientId}/${integrationId}/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      loadAlerts();
    } catch (err) {
      console.error('Error updating alert:', err);
    }
  };

  const handleSaveConfig = async (config) => {
    try {
      await authFetch(`${API_BASE}/api/integrations/client/${clientId}/${integrationId}/alerts/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      // Re-sync so changes are reflected immediately.
      await authFetch(`${API_BASE}/api/integrations/client/${clientId}/${integrationId}/sync`, { method: 'POST' });
      await Promise.all([loadAlerts(), loadArchive()]);
      alert('Configuración guardada');
    } catch (err) {
      console.error('Error saving config:', err);
    }
  };

  const filteredAlerts = filter === 'all' 
    ? alerts 
    : alerts.filter(a => a.status === filter);

  const activeCount = alerts.filter(a => a.status !== 'solved').length;

  if (loading) {
    return (
      <div style={{ ...cardStyle, padding: 24, textAlign: 'center', color: '#9ca3af' }}>
        Cargando alertas...
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1rem' }}>⚠️</span>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Alertas de Stock</div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              {activeCount > 0 ? `${activeCount} alertas activas` : 'Sin alertas'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 600 }}>Fuente</span>
            <select
              value="shopify"
              disabled
              style={{
                fontSize: '0.7rem',
                padding: '4px 8px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: '#f9fafb',
                color: '#374151',
              }}
            >
              <option value="shopify">Shopify</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
          {['all', 'active', 'solved'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontSize: '0.65rem', padding: '4px 8px', borderRadius: 6,
                background: filter === f ? '#1b5e3b' : '#f3f4f6',
                color: filter === f ? '#fff' : '#6b7280',
                border: 'none', cursor: 'pointer', fontWeight: 500,
              }}
            >
              {f === 'all' ? 'Todas' : f === 'active' ? 'Activas' : 'Resueltas'}
            </button>
          ))}
          </div>
        </div>
      </div>

      <AlertConfig config={alertConfig} onSave={handleSaveConfig} />

      {filteredAlerts.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: '0.8rem' }}>
          No hay alertas
        </div>
      ) : (
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {filteredAlerts.map((alert, i) => (
            <AlertItem key={i} alert={alert} onSolve={handleSolve} />
          ))}
        </div>
      )}

      <div style={{ borderTop: '1px solid #f0f1f5' }}>
        <button
          type="button"
          onClick={() => setShowArchive(v => !v)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#111827' }}>
            Historial de alertas
          </span>
          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            {archiveLoading ? 'Cargando…' : `${archive.length} archivadas`}
          </span>
        </button>

        {showArchive && (
          <div style={{ padding: '0 16px 16px' }}>
            {archiveLoading ? (
              <div style={{ padding: 16, textAlign: 'center', color: '#9ca3af', fontSize: '0.8rem' }}>
                Cargando historial…
              </div>
            ) : archive.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: '#9ca3af', fontSize: '0.8rem' }}>
                Sin alertas archivadas
              </div>
            ) : (
              <div style={{
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                overflow: 'hidden',
                background: '#fff',
                maxHeight: 260,
                overflowY: 'auto',
              }}>
                {archive.map((a, idx) => (
                  <div
                    key={a.id || idx}
                    style={{
                      padding: '10px 12px',
                      borderBottom: idx === archive.length - 1 ? 'none' : '1px solid #f0f1f5',
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827' }}>{a.productName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>
                      {a.variantTitle ? `${a.variantTitle} • ` : ''}{a.message}
                    </div>
                    {a.archivedAt && (
                      <div style={{ fontSize: '0.65rem', color: '#9ca3af', marginTop: 6 }}>
                        Archivada: {new Date(a.archivedAt).toLocaleDateString('es-ES')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 8, fontSize: '0.7rem', color: '#9ca3af' }}>
              Se muestran como máximo 50 alertas archivadas por integración.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
