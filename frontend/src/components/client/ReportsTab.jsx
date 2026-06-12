import { useState } from 'react';
import { authFetch } from '../../lib/api';
import { API_BASE } from '../../lib/constants';
import tokens from './workspace/tokens';
import ReportDaily from './ReportDaily';
import ReportWeekly from './ReportWeekly';
import ReportMonthly from './ReportMonthly';
import DataIngestionPanel from './DataIngestionPanel';
import DataExplorer from './DataExplorer';

const views = [
  { key: 'daily', label: 'Diario' },
  { key: 'weekly', label: 'Semanal' },
  { key: 'monthly', label: 'Mensual' },
  { key: 'explorer', label: 'Explorer' },
  { key: 'ingestion', label: 'Datos' },
];

export default function ReportsTab({ clientId, onSectionChange }) {
  const handleNavigateIntegrations = () => onSectionChange?.('integrations');
  const [activeView, setActiveView] = useState('daily');
  const [syncing, setSyncing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Get all connected integrations
      const r = await authFetch(`${API_BASE}/api/integrations/client/${clientId}`);
      const data = await r.json();
      const integrations = data.integrations || data || [];
      const connected = integrations.filter((i) => i.status === 'connected');

      // Sync each one
      for (const integ of connected) {
        try {
          await authFetch(`${API_BASE}/api/integrations/client/${clientId}/${integ.id}/sync`, { method: 'POST' });
        } catch {}
      }

      // Force refresh current view
      setRefreshKey((k) => k + 1);
    } catch {} finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: tokens.space[2], marginBottom: tokens.space[5], alignItems: 'center' }}>
        {views.map((v) => (
          <button
            key={v.key}
            onClick={() => setActiveView(v.key)}
            style={{
              padding: `${tokens.space[2]}px ${tokens.space[4]}px`,
              borderRadius: tokens.radius.md,
              border: `1px solid ${activeView === v.key ? tokens.accent : tokens.border}`,
              background: activeView === v.key ? tokens.accentSoft : tokens.surface,
              color: activeView === v.key ? tokens.accentInk : tokens.ink,
              fontWeight: activeView === v.key ? 600 : 400,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {v.label}
          </button>
        ))}
        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            marginLeft: 'auto',
            padding: `${tokens.space[2]}px ${tokens.space[3]}px`,
            borderRadius: tokens.radius.md,
            border: `1px solid ${tokens.border}`,
            background: tokens.surface,
            color: syncing ? tokens.inkMuted : tokens.accent,
            fontSize: 13,
            cursor: syncing ? 'wait' : 'pointer',
            opacity: syncing ? 0.6 : 1,
          }}
        >
          {syncing ? 'Sincronizando...' : '↻ Sincronizar'}
        </button>
      </div>

      {activeView === 'daily' && <ReportDaily key={refreshKey} clientId={clientId} onNavigateIntegrations={handleNavigateIntegrations} />}
      {activeView === 'weekly' && <ReportWeekly key={refreshKey} clientId={clientId} onNavigateIntegrations={handleNavigateIntegrations} />}
      {activeView === 'monthly' && <ReportMonthly key={refreshKey} clientId={clientId} onNavigateIntegrations={handleNavigateIntegrations} />}
      {activeView === 'explorer' && <DataExplorer key={refreshKey} clientId={clientId} />}
      {activeView === 'ingestion' && <DataIngestionPanel key={refreshKey} clientId={clientId} />}
    </div>
  );
}
