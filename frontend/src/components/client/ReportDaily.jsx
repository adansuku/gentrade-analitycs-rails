import { useState, useEffect } from 'react';
import { authFetch } from '../../lib/api';
import { API_BASE } from '../../lib/constants';
import tokens from './workspace/tokens';
import MissingIntegrationsCTA from './MissingIntegrationsCTA';

function MetricCard({ label, value, suffix, muted }) {
  return (
    <div
      style={{
        flex: '1 1 0',
        minWidth: 140,
        padding: tokens.space[4],
        background: tokens.surface,
        borderRadius: tokens.radius.md,
        border: `1px solid ${tokens.border}`,
      }}
    >
      <div style={{ fontSize: 12, color: tokens.inkMuted, marginBottom: tokens.space[1] }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: muted ? tokens.inkMuted : tokens.ink }}>
        {value ?? '–'}
        {suffix && value != null && <span style={{ fontSize: 13, fontWeight: 400, color: tokens.inkSoft }}> {suffix}</span>}
      </div>
    </div>
  );
}

function SourcesList({ sources }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: tokens.space[2], marginTop: tokens.space[3] }}>
      {sources.map((s) => (
        <span
          key={s.integrationId}
          style={{
            fontSize: 11,
            color: tokens.inkMuted,
            background: tokens.surfaceAlt,
            padding: `2px ${tokens.space[2]}px`,
            borderRadius: tokens.radius.sm,
          }}
        >
          {s.name} · {s.lastSyncAt ? new Date(s.lastSyncAt).toLocaleDateString('es-ES') : '–'}
        </span>
      ))}
    </div>
  );
}

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return `${dayNames[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function shiftDate(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReportDaily({ clientId, onNavigateIntegrations }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [date, setDate] = useState(getToday);

  const isToday = date === getToday();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const param = isToday ? '' : `?date=${date}`;
    authFetch(`${API_BASE}/api/clients/${clientId}/reports/daily${param}`)
      .then((res) => res.json())
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clientId, date]);

  if (loading) {
    return (
      <div style={{ padding: tokens.space[6], textAlign: 'center', color: tokens.inkMuted, fontSize: 14 }}>
        Cargando reporte diario...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: tokens.space[6], textAlign: 'center', color: tokens.danger, fontSize: 14 }}>
        Error al cargar el reporte.
      </div>
    );
  }

  const { metrics, sources, missing } = data || {};
  const hasAnyData = metrics && (metrics.revenue || metrics.adSpend || metrics.sessions);

  const navBar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: tokens.space[3], marginBottom: tokens.space[4] }}>
      <button onClick={() => setDate(shiftDate(date, -1))} style={{ background: 'none', border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.sm, padding: `${tokens.space[1]}px ${tokens.space[2]}px`, cursor: 'pointer', color: tokens.inkSoft, fontSize: 14 }}>←</button>
      <span style={{ fontSize: 14, fontWeight: 600, color: tokens.ink }}>{formatDate(date)}</span>
      {!isToday && (
        <button onClick={() => setDate(shiftDate(date, 1))} style={{ background: 'none', border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.sm, padding: `${tokens.space[1]}px ${tokens.space[2]}px`, cursor: 'pointer', color: tokens.inkSoft, fontSize: 14 }}>→</button>
      )}
      {!isToday && (
        <button onClick={() => setDate(getToday())} style={{ background: 'none', border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.sm, padding: `${tokens.space[1]}px ${tokens.space[2]}px`, cursor: 'pointer', color: tokens.accent, fontSize: 12 }}>Hoy</button>
      )}
    </div>
  );

  if (!hasAnyData) {
    return (
      <div>
        {navBar}
        <div style={{ padding: tokens.space[6], background: tokens.surfaceAlt, borderRadius: tokens.radius.md, border: `1px solid ${tokens.borderSoft}`, textAlign: 'center', color: tokens.inkSoft, fontSize: 14 }}>
          <p style={{ margin: 0 }}>Sin datos disponibles para este día.</p>
          <p style={{ margin: `${tokens.space[2]}px 0 0`, color: tokens.inkMuted, fontSize: 13 }}>Conecta integraciones para ver las métricas de rendimiento.</p>
          <MissingIntegrationsCTA missing={missing} onNavigateIntegrations={onNavigateIntegrations} />
        </div>
      </div>
    );
  }

  const revenue = metrics.revenue;
  const adSpend = metrics.adSpend;
  const roas = metrics.roas;
  const sessions = metrics.sessions;

  return (
    <div>
      {navBar}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: tokens.space[3] }}>
        <MetricCard
          label="Ingresos"
          value={revenue ? `${revenue.value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : null}
        />
        <MetricCard
          label="Gasto en Ads"
          value={adSpend ? `${adSpend.total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : null}
          muted={!adSpend}
        />
        <MetricCard
          label="ROAS"
          value={roas ? roas.value.toFixed(2) : null}
          muted={!roas}
        />
        <MetricCard
          label="Sesiones"
          value={sessions ? sessions.value.toLocaleString('es-ES') : null}
          muted={!sessions}
        />
      </div>

      {adSpend && Object.keys(adSpend).filter((k) => k !== 'total').length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: tokens.space[2], marginTop: tokens.space[3] }}>
          {Object.entries(adSpend)
            .filter(([k]) => k !== 'total')
            .map(([platform, value]) => (
              <span
                key={platform}
                style={{
                  fontSize: 12,
                  color: tokens.inkSoft,
                  background: tokens.surfaceAlt,
                  padding: `${tokens.space[1]}px ${tokens.space[2]}px`,
                  borderRadius: tokens.radius.sm,
                  border: `1px solid ${tokens.borderSoft}`,
                }}
              >
                {platform}: {Number(value).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </span>
            ))}
        </div>
      )}

      <SourcesList sources={sources} />
      <MissingIntegrationsCTA missing={missing} onNavigateIntegrations={onNavigateIntegrations} />
    </div>
  );
}
