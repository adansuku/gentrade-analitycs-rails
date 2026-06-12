import { useState, useEffect, useCallback, useMemo } from 'react';
import { authFetch } from '../../lib/api';
import { API_BASE } from '../../lib/constants';
import tokens from './workspace/tokens';
import MissingIntegrationsCTA from './MissingIntegrationsCTA';
import ObjectivesForm from './ObjectivesForm';
import CostsForm from './CostsForm';

function MetricCard({ label, value, muted }) {
  return (
    <div style={{ flex: '1 1 0', minWidth: 140, padding: tokens.space[4], background: tokens.surface, borderRadius: tokens.radius.md, border: `1px solid ${tokens.border}` }}>
      <div style={{ fontSize: 12, color: tokens.inkMuted, marginBottom: tokens.space[1] }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: muted ? tokens.inkMuted : tokens.ink }}>{value ?? '–'}</div>
    </div>
  );
}

const statusConfig = {
  ahead: { label: 'Adelantado', color: '#16a34a', bg: '#f0fdf4' },
  'on-track': { label: 'En ritmo', color: '#ca8a04', bg: '#fefce8' },
  behind: { label: 'Retrasado', color: '#dc2626', bg: '#fef2f2' },
};

function PaceBadge({ status }) {
  const cfg = statusConfig[status] || statusConfig['on-track'];
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg, padding: '2px 8px', borderRadius: tokens.radius.sm }}>
      {cfg.label}
    </span>
  );
}

function ObjectiveRow({ label, target, actual, paceExpected, paceActual, status, suffix }) {
  const pct = target > 0 ? Math.min(Math.round((actual / target) * 100), 100) : 0;
  return (
    <div style={{ padding: `${tokens.space[3]}px 0`, borderBottom: `1px solid ${tokens.borderSoft}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.space[2] }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: tokens.ink }}>{label}</span>
        <PaceBadge status={status} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.space[3] }}>
        <div style={{ flex: 1, height: 6, background: tokens.surfaceAlt, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: statusConfig[status]?.color || tokens.accent, borderRadius: 3, transition: 'width 0.3s ease' }} />
        </div>
        <span style={{ fontSize: 12, color: tokens.inkSoft, whiteSpace: 'nowrap' }}>
          {actual?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}{suffix} / {target?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}{suffix}
        </span>
      </div>
      <div style={{ fontSize: 11, color: tokens.inkMuted, marginTop: tokens.space[1] }}>
        Ritmo esperado: {paceExpected}% · Ritmo actual: {paceActual}%
      </div>
    </div>
  );
}

function YoYComparison({ clientId }) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleCompare = async () => {
    if (!start || !end) return;
    setLoading(true);
    try {
      const r = await authFetch(`${API_BASE}/api/clients/${clientId}/reports/compare?start=${start}&end=${end}`);
      setData(await r.json());
    } catch {} finally { setLoading(false); }
  };

  const inputStyle = { padding: `${tokens.space[2]}px ${tokens.space[2]}px`, borderRadius: tokens.radius.sm, border: `1px solid ${tokens.border}`, fontSize: 13 };

  if (!open) {
    return (
      <div style={{ marginTop: tokens.space[5] }}>
        <button onClick={() => setOpen(true)} style={{
          width: '100%', padding: `${tokens.space[3]}px ${tokens.space[4]}px`, borderRadius: tokens.radius.md,
          border: `1px dashed ${tokens.border}`, background: tokens.surfaceAlt, color: tokens.accent,
          fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s ease',
        }}>
          Comparar período vs año anterior
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: tokens.space[5], padding: tokens.space[4], background: tokens.surface, borderRadius: tokens.radius.md, border: `1px solid ${tokens.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.space[3] }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: tokens.ink }}>Comparación período vs año anterior</h4>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tokens.inkMuted, fontSize: 14 }}>×</button>
      </div>
      <div style={{ display: 'flex', gap: tokens.space[2], alignItems: 'center', marginBottom: tokens.space[3], flexWrap: 'wrap' }}>
        <input type="date" value={start} onChange={e => setStart(e.target.value)} style={inputStyle} />
        <span style={{ color: tokens.inkMuted }}>→</span>
        <input type="date" value={end} onChange={e => setEnd(e.target.value)} style={inputStyle} />
        <button onClick={handleCompare} disabled={loading || !start || !end} style={{ padding: `${tokens.space[2]}px ${tokens.space[3]}px`, borderRadius: tokens.radius.sm, border: 'none', background: tokens.accent, color: '#fff', fontSize: 13, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Comparando...' : 'Comparar'}
        </button>
      </div>
      {data && (
        <div>
          <div style={{ fontSize: 11, color: tokens.inkMuted, marginBottom: tokens.space[3] }}>
            {data.period?.current?.start} → {data.period?.current?.end} vs {data.period?.previous?.start} → {data.period?.previous?.end}
          </div>
          {Object.entries(data.metrics || {}).map(([key, m]) => {
            const labels = { revenue: 'Ingresos', adSpend: 'Gasto Ads', sessions: 'Sesiones', roas: 'ROAS' };
            const suffix = key === 'revenue' || key === 'adSpend' ? ' €' : '';
            return (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${tokens.space[2]}px 0`, borderBottom: `1px solid ${tokens.borderSoft}` }}>
                <span style={{ fontSize: 13, color: tokens.ink }}>{labels[key] || key}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: tokens.space[3] }}>
                  <span style={{ fontSize: 12, color: tokens.inkMuted }}>
                    {m.previous?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}{suffix} → {m.current?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}{suffix}
                  </span>
                  {m.change != null && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: m.change >= 0 ? '#16a34a' : '#dc2626' }}>
                      {m.change >= 0 ? '↑' : '↓'} {m.change >= 0 ? '+' : ''}{m.change}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {data.channels?.length > 0 && (
            <div style={{ marginTop: tokens.space[3] }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: tokens.ink, marginBottom: tokens.space[2] }}>Por canal:</div>
              {data.channels.map((ch, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${tokens.space[1]}px 0`, fontSize: 12 }}>
                  <span style={{ color: tokens.inkSoft }}>{ch.channel}</span>
                  <span style={{ color: ch.sessions.change >= 0 ? '#16a34a' : '#dc2626', fontWeight: 500 }}>
                    {ch.sessions.current.toLocaleString('es-ES')} ses. ({ch.sessions.change >= 0 ? '+' : ''}{ch.sessions.change}%)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CampaignTable({ platform, items, label }) {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...items].sort((a, b) => (b.spend || 0) - (a.spend || 0));
  const visible = expanded ? sorted : sorted.slice(0, 10);
  const hasMore = sorted.length > 10;

  return (
    <div style={{ marginBottom: tokens.space[4], padding: tokens.space[4], background: tokens.surface, borderRadius: tokens.radius.md, border: `1px solid ${tokens.border}` }}>
      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: tokens.ink, marginBottom: tokens.space[3] }}>
        {label} <span style={{ fontWeight: 400, color: tokens.inkMuted, fontSize: 12 }}>({items.length})</span>
      </h4>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${tokens.border}` }}>
              <th style={{ textAlign: 'left', padding: `${tokens.space[2]}px`, color: tokens.inkMuted, fontWeight: 500 }}>Campaña</th>
              <th style={{ textAlign: 'right', padding: `${tokens.space[2]}px`, color: tokens.inkMuted, fontWeight: 500 }}>Gasto</th>
              <th style={{ textAlign: 'right', padding: `${tokens.space[2]}px`, color: tokens.inkMuted, fontWeight: 500 }}>Clics</th>
              <th style={{ textAlign: 'right', padding: `${tokens.space[2]}px`, color: tokens.inkMuted, fontWeight: 500 }}>CPC</th>
              <th style={{ textAlign: 'right', padding: `${tokens.space[2]}px`, color: tokens.inkMuted, fontWeight: 500 }}>CTR</th>
              <th style={{ textAlign: 'right', padding: `${tokens.space[2]}px`, color: tokens.inkMuted, fontWeight: 500 }}>Conv.</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((c, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${tokens.borderSoft}` }}>
                <td style={{ padding: `${tokens.space[2]}px`, color: tokens.ink, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</td>
                <td style={{ textAlign: 'right', padding: `${tokens.space[2]}px`, color: tokens.ink, fontWeight: 500 }}>{c.spend?.toFixed(2)} €</td>
                <td style={{ textAlign: 'right', padding: `${tokens.space[2]}px`, color: tokens.inkSoft }}>{c.clicks?.toLocaleString('es-ES') || '–'}</td>
                <td style={{ textAlign: 'right', padding: `${tokens.space[2]}px`, color: tokens.inkSoft }}>{(c.cpc || (c.clicks > 0 ? c.spend / c.clicks : 0))?.toFixed(2) || '–'} €</td>
                <td style={{ textAlign: 'right', padding: `${tokens.space[2]}px`, color: tokens.inkSoft }}>{(c.ctr || (c.impressions > 0 ? (c.clicks / c.impressions * 100) : 0))?.toFixed(2) || '–'}%</td>
                <td style={{ textAlign: 'right', padding: `${tokens.space[2]}px`, color: tokens.inkSoft }}>{c.conversions || '–'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 600 }}>
              <td style={{ padding: `${tokens.space[2]}px`, color: tokens.ink }}>Total</td>
              <td style={{ textAlign: 'right', padding: `${tokens.space[2]}px`, color: tokens.ink }}>{items.reduce((s, c) => s + (c.spend || 0), 0).toFixed(2)} €</td>
              <td style={{ textAlign: 'right', padding: `${tokens.space[2]}px`, color: tokens.ink }}>{items.reduce((s, c) => s + (c.clicks || 0), 0).toLocaleString('es-ES')}</td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </table>
      </div>
      {hasMore && (
        <button onClick={() => setExpanded(!expanded)} style={{ marginTop: tokens.space[2], fontSize: 12, color: tokens.accent, background: 'none', border: 'none', cursor: 'pointer' }}>
          {expanded ? 'Mostrar menos' : `Ver las ${sorted.length - 10} campañas restantes`}
        </button>
      )}
    </div>
  );
}

function CampaignBreakdown({ campaigns }) {
  const byPlatform = {};
  for (const c of campaigns) {
    const p = c.platform || 'other';
    if (!byPlatform[p]) byPlatform[p] = [];
    byPlatform[p].push(c);
  }
  const platformLabels = { meta: 'Meta Ads', google: 'Google Ads', tiktok: 'TikTok Ads' };

  return (
    <div style={{ marginTop: tokens.space[5] }}>
      {Object.entries(byPlatform).map(([platform, items]) => (
        <CampaignTable key={platform} platform={platform} items={items} label={`Campañas ${platformLabels[platform] || platform}`} />
      ))}
    </div>
  );
}

function NarrativeText({ text }) {
  if (!text) return null;

  // Split into paragraphs by double newlines
  const blocks = text.split(/\n\n+/).filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space[3] }}>
      {blocks.map((block, i) => {
        const lines = block.split('\n').filter(Boolean);

        // First block = summary headline
        if (i === 0) {
          return (
            <div key={i} style={{ padding: tokens.space[3], background: tokens.accentSoft, borderRadius: tokens.radius.md, borderLeft: `3px solid ${tokens.accent}` }}>
              {lines.map((line, j) => (
                <div key={j} style={{ fontSize: j === 0 ? 15 : 13, fontWeight: j === 0 ? 600 : 400, color: j === 0 ? tokens.accentInk : tokens.ink, lineHeight: 1.5, marginTop: j > 0 ? tokens.space[1] : 0 }}>
                  {line}
                </div>
              ))}
            </div>
          );
        }

        // Investment lines (contain € and =)
        const isInvestmentBlock = lines.every(l => l.includes('€') && (l.includes('=') || l.includes('Inversión') || l.includes('Fee') || l.includes('ROAS')));
        if (isInvestmentBlock) {
          return (
            <div key={i} style={{ padding: tokens.space[3], background: tokens.surfaceAlt, borderRadius: tokens.radius.md, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.8 }}>
              {lines.map((line, j) => {
                const isTotalLine = line.startsWith('Inversión Total') || line.startsWith('ROAS');
                return (
                  <div key={j} style={{ color: isTotalLine ? tokens.ink : tokens.inkSoft, fontWeight: isTotalLine ? 600 : 400 }}>
                    {line}
                  </div>
                );
              })}
            </div>
          );
        }

        // Regular analysis paragraph
        return (
          <div key={i} style={{ fontSize: 14, lineHeight: 1.7, color: tokens.ink }}>
            {lines.map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {highlightMetrics(line)}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function highlightMetrics(text) {
  // Highlight percentages and euro amounts inline
  const parts = text.split(/(\+?\-?\d+[\.,]?\d*%|\d+[\.,]?\d*€)/g);
  return parts.map((part, i) => {
    if (part.match(/^\+\d.*%$/)) return <span key={i} style={{ color: '#16a34a', fontWeight: 600 }}>{part}</span>;
    if (part.match(/^\-\d.*%$/)) return <span key={i} style={{ color: '#dc2626', fontWeight: 600 }}>{part}</span>;
    if (part.match(/\d.*€$/)) return <span key={i} style={{ fontWeight: 500 }}>{part}</span>;
    if (part.match(/\d+%$/)) return <span key={i} style={{ fontWeight: 500 }}>{part}</span>;
    return part;
  });
}

function InsightsSection({ clientId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    authFetch(`${API_BASE}/api/clients/${clientId}/reports/insights`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const r = await authFetch(`${API_BASE}/api/clients/${clientId}/reports/insights/regenerate`, { method: 'POST' });
      const d = await r.json();
      setData({ insights: d.insights });
    } catch {} finally { setRegenerating(false); }
  };

  if (loading) return null;

  const severityConfig = {
    high: { color: '#dc2626', bg: '#fef2f2', border: '#dc2626' },
    medium: { color: '#ca8a04', bg: '#fefce8', border: '#ca8a04' },
    low: { color: '#16a34a', bg: '#f0fdf4', border: '#16a34a' },
  };

  const insights = data?.insights;

  return (
    <div style={{ marginBottom: tokens.space[4], padding: tokens.space[4], background: tokens.surface, borderRadius: tokens.radius.md, border: `1px solid ${tokens.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.space[3] }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: tokens.ink }}>Insights del mes</h4>
        <button onClick={handleRegenerate} disabled={regenerating} style={{ fontSize: 12, color: tokens.accent, background: 'none', border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.sm, padding: `${tokens.space[1]}px ${tokens.space[3]}px`, cursor: 'pointer', opacity: regenerating ? 0.6 : 1 }}>
          {regenerating ? 'Generando...' : insights ? 'Regenerar' : 'Generar insights'}
        </button>
      </div>
      {insights && Array.isArray(insights) ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space[2] }}>
          {insights.map((insight, i) => {
            const cfg = severityConfig[insight.severity] || severityConfig.medium;
            return (
              <div key={i} style={{ padding: tokens.space[3], borderRadius: tokens.radius.md, background: cfg.bg, borderLeft: `3px solid ${cfg.border}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: cfg.color, marginBottom: tokens.space[1] }}>{insight.title}</div>
                <div style={{ fontSize: 13, color: tokens.ink, lineHeight: 1.5, marginBottom: tokens.space[2] }}>{insight.description}</div>
                <div style={{ fontSize: 13, color: tokens.accent, fontWeight: 500 }}>→ {insight.recommendation}</div>
                {insight.dataPoints?.length > 0 && (
                  <div style={{ display: 'flex', gap: tokens.space[1], flexWrap: 'wrap', marginTop: tokens.space[2] }}>
                    {insight.dataPoints.map((dp, j) => (
                      <span key={j} style={{ fontSize: 11, color: tokens.inkMuted, background: tokens.surface, padding: `1px ${tokens.space[2]}px`, borderRadius: tokens.radius.sm }}>{dp}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: tokens.space[3], color: tokens.inkMuted, fontSize: 13 }}>
          {regenerating ? 'Generando insights...' : 'Pulsa "Generar insights" para obtener recomendaciones basadas en tus datos.'}
        </div>
      )}
    </div>
  );
}

function InvestmentRow({ label, budget, spent, pct }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${tokens.space[2]}px 0`, borderBottom: `1px solid ${tokens.borderSoft}` }}>
      <span style={{ fontSize: 13, color: tokens.ink }}>{label}</span>
      <span style={{ fontSize: 12, color: tokens.inkSoft }}>
        {budget != null ? `${budget.toLocaleString('es-ES')} €` : '–'} → <strong>{spent.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</strong>
        {pct != null && <span style={{ color: pct > 100 ? '#dc2626' : tokens.inkMuted }}> ({pct}%)</span>}
      </span>
    </div>
  );
}

function InvestmentBreakdown({ investment }) {
  return (
    <div>
      {Object.entries(investment.platforms || {}).map(([platform, data]) => (
        <InvestmentRow key={platform} label={`Inversión ${platform}`} budget={data.budget} spent={data.spent} pct={data.pctConsumed} />
      ))}
      {(investment.fixedCosts || []).map((fc, i) => (
        <InvestmentRow key={i} label={fc.name} budget={fc.monthly} spent={fc.prorated} pct={null} />
      ))}
      {investment.fee && investment.fee.amount > 0 && (
        <InvestmentRow label={`Fee ${investment.fee.percent}%`} budget={investment.fee.budget} spent={investment.fee.amount} pct={null} />
      )}
      {investment.total && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${tokens.space[3]}px 0`, fontWeight: 600 }}>
          <span style={{ fontSize: 13, color: tokens.ink }}>Inversión Total</span>
          <span style={{ fontSize: 13, color: tokens.ink }}>
            {investment.total.budget != null ? `${investment.total.budget.toLocaleString('es-ES')} €` : '–'} → {investment.total.spent.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            {investment.total.pctConsumed != null && <span style={{ color: tokens.inkMuted }}> ({investment.total.pctConsumed}%)</span>}
          </span>
        </div>
      )}
      {investment.roasNet != null && (
        <div style={{ marginTop: tokens.space[2], fontSize: 12, color: tokens.inkSoft }}>
          ROAS neto (incluyendo fee): <strong>{investment.roasNet}</strong>
        </div>
      )}
    </div>
  );
}

function YoYRow({ label, current, previous, change, suffix }) {
  const isPositive = change >= 0;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${tokens.space[2]}px 0`, borderBottom: `1px solid ${tokens.borderSoft}` }}>
      <span style={{ fontSize: 13, color: tokens.ink }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.space[3] }}>
        <span style={{ fontSize: 12, color: tokens.inkMuted }}>
          {previous?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}{suffix} → {current?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}{suffix}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: isPositive ? '#16a34a' : '#dc2626' }}>
          {isPositive ? '↑' : '↓'} {isPositive ? '+' : ''}{change}%
        </span>
      </div>
    </div>
  );
}

function NarrativeSection({ clientId, narrative, onRegenerated }) {
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!narrative?.text) return;
    navigator.clipboard.writeText(narrative.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await authFetch(`${API_BASE}/api/clients/${clientId}/reports/monthly/regenerate-narrative`, { method: 'POST' });
      onRegenerated?.();
    } catch {
      // silently fail — existing narrative stays
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div style={{ marginTop: tokens.space[5], padding: tokens.space[4], background: tokens.surface, borderRadius: tokens.radius.md, border: `1px solid ${tokens.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.space[3] }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: tokens.ink }}>Análisis IA</h4>
        <div style={{ display: 'flex', gap: tokens.space[2] }}>
          {narrative && (
            <button
              onClick={handleCopy}
              style={{
                padding: `${tokens.space[1]}px ${tokens.space[3]}px`, borderRadius: tokens.radius.sm,
                border: `1px solid ${tokens.border}`, background: copied ? '#f0fdf4' : tokens.surface,
                color: copied ? '#16a34a' : tokens.inkSoft, fontSize: 12, cursor: 'pointer',
              }}
            >
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          )}
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            style={{
              padding: `${tokens.space[1]}px ${tokens.space[3]}px`, borderRadius: tokens.radius.sm,
              border: `1px solid ${tokens.border}`, background: tokens.surface, color: tokens.accent,
              fontSize: 12, cursor: regenerating ? 'wait' : 'pointer', opacity: regenerating ? 0.6 : 1,
            }}
          >
            {regenerating ? 'Generando...' : narrative ? 'Regenerar análisis' : 'Generar análisis'}
          </button>
        </div>
      </div>
      {narrative ? (
        <div>
          <NarrativeText text={narrative.text} />
          <div style={{ marginTop: tokens.space[3], fontSize: 11, color: tokens.inkMuted }}>
            Generado: {new Date(narrative.generatedAt).toLocaleString('es-ES')}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: tokens.space[3], color: tokens.inkMuted, fontSize: 13 }}>
          {regenerating ? 'Generando análisis...' : 'Datos insuficientes para generar análisis o LLM no configurado.'}
        </div>
      )}
    </div>
  );
}

function getCurrentYearMonth() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`;
}

function getDefaultYearMonth() {
  const t = new Date();
  // If it's day 1, show previous month (data until yesterday = last day of previous month)
  if (t.getDate() === 1) {
    const prevMonth = new Date(t.getFullYear(), t.getMonth() - 1, 1);
    return `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
  }
  // Otherwise show current month (data until yesterday)
  return getCurrentYearMonth();
}

function shiftMonth(yearMonth, delta) {
  const [y, m] = yearMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function formatYearMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${monthNames[m - 1]} ${y}`;
}

export default function ReportMonthly({ clientId, onNavigateIntegrations }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showObjectivesForm, setShowObjectivesForm] = useState(false);
  const [showCostsForm, setShowCostsForm] = useState(false);
  const [yearMonth, setYearMonth] = useState(getDefaultYearMonth);
  const [recalculating, setRecalculating] = useState(false);
  const [copyingSlack, setCopyingSlack] = useState(false);
  const [slackCopied, setSlackCopied] = useState(false);
  const [slackReport, setSlackReport] = useState(null);

  // Memoize to prevent recalculation on every render
  const isCurrentMonth = useMemo(() => yearMonth === getCurrentYearMonth(), [yearMonth]);

  // Unified fetch function - always pass yearMonth parameter
  const fetchReport = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    // Fetch both report and Slack in parallel, always with yearMonth parameter
    const reportPromise = authFetch(`${API_BASE}/api/clients/${clientId}/reports/monthly?yearMonth=${yearMonth}`)
      .then((res) => res.json());

    const slackPromise = authFetch(`${API_BASE}/api/clients/${clientId}/reports/monthly/slack?yearMonth=${yearMonth}`)
      .then(r => r.json());

    Promise.all([reportPromise, slackPromise])
      .then(([reportData, slackData]) => {
        if (!cancelled) {
          setData(reportData);
          // Extract .text if response is {text: '...'} format (for Slack compatibility)
          const report = slackData.report?.text || slackData.report;
          setSlackReport(report);
        }
      })
      .catch((e) => { if (!cancelled) setError(e); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [clientId, yearMonth]);

  // Single useEffect for all data fetching
  useEffect(() => {
    const cleanup = fetchReport();
    return cleanup;
  }, [fetchReport]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await authFetch(`${API_BASE}/api/clients/${clientId}/reports/monthly/recalculate?yearMonth=${yearMonth}`, { method: 'POST' });
      fetchReport(); // Reload report with fresh data
    } catch (err) {
      console.error('Recalculate failed:', err);
    } finally {
      setRecalculating(false);
    }
  };

  const handleCopySlackReport = async () => {
    if (!slackReport) return;
    setCopyingSlack(true);
    try {
      await navigator.clipboard.writeText(slackReport);
      setSlackCopied(true);
      setTimeout(() => setSlackCopied(false), 2000);
    } catch (err) {
      console.error('Copy Slack report failed:', err);
    } finally {
      setCopyingSlack(false);
    }
  };

  if (loading) {
    return <div style={{ padding: tokens.space[6], textAlign: 'center', color: tokens.inkMuted, fontSize: 14 }}>Cargando reporte mensual...</div>;
  }

  if (error) {
    return <div style={{ padding: tokens.space[6], textAlign: 'center', color: tokens.danger, fontSize: 14 }}>Error al cargar el reporte.</div>;
  }

  const { metrics, sources, missing, objectives, investment } = data || {};
  const hasAnyData = metrics && (metrics.revenue || metrics.adSpend || metrics.sessions);

  if (!hasAnyData) {
    return (
      <div style={{ padding: tokens.space[6], background: tokens.surfaceAlt, borderRadius: tokens.radius.md, border: `1px solid ${tokens.borderSoft}`, textAlign: 'center', color: tokens.inkSoft, fontSize: 14 }}>
        <p style={{ margin: 0 }}>Sin datos disponibles para el reporte mensual.</p>
        <p style={{ margin: `${tokens.space[2]}px 0 0`, color: tokens.inkMuted, fontSize: 13 }}>Conecta integraciones para ver las métricas de rendimiento.</p>
        <MissingIntegrationsCTA missing={missing} onNavigateIntegrations={onNavigateIntegrations} />
      </div>
    );
  }

  const revenue = metrics.revenue;
  const adSpend = metrics.adSpend;
  const roas = metrics.roas;
  const roasNet = investment?.roasNet;
  const sessions = metrics.sessions;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.space[3], marginBottom: tokens.space[4] }}>
        <button
          onClick={() => setYearMonth(shiftMonth(yearMonth, -1))}
          style={{ background: 'none', border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.sm, padding: `${tokens.space[1]}px ${tokens.space[2]}px`, cursor: 'pointer', color: tokens.inkSoft, fontSize: 14 }}
        >
          ←
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: tokens.ink }}>{formatYearMonth(yearMonth)}</span>
        {!isCurrentMonth && (
          <button
            onClick={() => setYearMonth(shiftMonth(yearMonth, 1))}
            style={{ background: 'none', border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.sm, padding: `${tokens.space[1]}px ${tokens.space[2]}px`, cursor: 'pointer', color: tokens.inkSoft, fontSize: 14 }}
          >
            →
          </button>
        )}
        {data?.frozen && (
          <span style={{ fontSize: 11, color: tokens.inkMuted, background: tokens.surfaceAlt, padding: `2px ${tokens.space[2]}px`, borderRadius: tokens.radius.sm }}>Snapshot guardado</span>
        )}
        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          style={{
            marginLeft: 'auto',
            padding: `${tokens.space[1]}px ${tokens.space[3]}px`,
            borderRadius: tokens.radius.sm,
            border: `1px solid ${tokens.border}`,
            background: tokens.surface,
            color: recalculating ? tokens.inkMuted : tokens.accent,
            fontSize: 12,
            cursor: recalculating ? 'wait' : 'pointer',
            opacity: recalculating ? 0.6 : 1,
          }}
        >
          {recalculating ? 'Recalculando...' : '↻ Recalcular datos'}
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: tokens.space[3] }}>
        <MetricCard label="Ingresos del mes" value={revenue ? `${revenue.value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : null} />
        <MetricCard
          label={investment?.total ? "Inversión total" : "Gasto en Ads"}
          value={investment?.total ? `${investment.total.spent.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : (adSpend ? `${adSpend.total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : null)}
          muted={!investment?.total && !adSpend}
        />
        <MetricCard
          label={roasNet != null ? "ROAS neto (con fee)" : "ROAS (solo ads)"}
          value={roasNet != null ? roasNet.toFixed(2) : (roas ? roas.value.toFixed(2) : null)}
          muted={roasNet == null && !roas}
        />
        <MetricCard label="Sesiones" value={sessions ? sessions.value.toLocaleString('es-ES') : null} muted={!sessions} />
      </div>

      {/* Executive Summary / Slack Report */}
      {slackReport && (
        <div style={{ marginTop: tokens.space[5], padding: tokens.space[4], background: tokens.surface, borderRadius: tokens.radius.md, border: `1px solid ${tokens.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.space[3] }}>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: tokens.ink }}>Resumen ejecutivo</h4>
            <button
              onClick={handleCopySlackReport}
              disabled={copyingSlack}
              style={{
                padding: `${tokens.space[1]}px ${tokens.space[3]}px`,
                borderRadius: tokens.radius.sm,
                border: `1px solid ${tokens.border}`,
                background: slackCopied ? '#16a34a' : tokens.surface,
                color: slackCopied ? '#fff' : (copyingSlack ? tokens.inkMuted : tokens.accent),
                fontSize: 12,
                cursor: copyingSlack ? 'wait' : 'pointer',
                opacity: copyingSlack ? 0.6 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              {slackCopied ? '✓ Copiado' : (copyingSlack ? 'Copiando...' : '📋 Copiar para Slack')}
            </button>
          </div>
          <pre style={{
            whiteSpace: 'pre-wrap',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            fontSize: 13,
            lineHeight: 1.6,
            color: tokens.ink,
            margin: 0,
            padding: tokens.space[3],
            background: tokens.surfaceAlt,
            borderRadius: tokens.radius.sm,
            border: `1px solid ${tokens.borderSoft}`,
          }}>
            {slackReport}
          </pre>
        </div>
      )}

      {/* AI Insights */}
      <InsightsSection clientId={clientId} />

      {/* Objectives section */}
      <div style={{ marginTop: tokens.space[5], padding: tokens.space[4], background: tokens.surface, borderRadius: tokens.radius.md, border: `1px solid ${tokens.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.space[3] }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: tokens.ink }}>Objetivos del mes</h4>
          <button
            onClick={() => setShowObjectivesForm(true)}
            style={{
              padding: `${tokens.space[1]}px ${tokens.space[3]}px`, borderRadius: tokens.radius.sm,
              border: `1px solid ${tokens.border}`, background: tokens.surface, color: tokens.accent,
              fontSize: 12, cursor: 'pointer',
            }}
          >
            {objectives ? 'Editar objetivos' : 'Configurar objetivos'}
          </button>
        </div>

        {objectives ? (
          <div>
            {objectives.revenue && (
              <ObjectiveRow label="Ingresos" target={objectives.revenue.target} actual={objectives.revenue.actual} paceExpected={objectives.revenue.paceExpected} paceActual={objectives.revenue.paceActual} status={objectives.revenue.status} suffix=" €" />
            )}
            {objectives.roas && (
              <ObjectiveRow label="ROAS" target={objectives.roas.target} actual={objectives.roas.actual} paceExpected={objectives.roas.paceExpected} paceActual={objectives.roas.paceActual} status={objectives.roas.status} suffix="" />
            )}
            {objectives.adSpend && Object.entries(objectives.adSpend).map(([platform, obj]) => (
              <ObjectiveRow key={platform} label={`Ads ${platform}`} target={obj.budget} actual={obj.spent} paceExpected={obj.paceExpected} paceActual={obj.paceActual} status={obj.status} suffix=" €" />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: tokens.space[4], color: tokens.inkMuted, fontSize: 13 }}>
            Sin objetivos configurados. Define tus metas para ver el progreso.
          </div>
        )}
      </div>

      {/* Investment breakdown section */}
      <div style={{ marginTop: tokens.space[5], padding: tokens.space[4], background: tokens.surface, borderRadius: tokens.radius.md, border: `1px solid ${tokens.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.space[3] }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: tokens.ink }}>Inversión del mes</h4>
          <button
            onClick={() => setShowCostsForm(true)}
            style={{ padding: `${tokens.space[1]}px ${tokens.space[3]}px`, borderRadius: tokens.radius.sm, border: `1px solid ${tokens.border}`, background: tokens.surface, color: tokens.accent, fontSize: 12, cursor: 'pointer' }}
          >
            {data?.costs ? 'Editar costes' : 'Configurar costes'}
          </button>
        </div>
        {data?.investment ? (
          <InvestmentBreakdown investment={data.investment} />
        ) : (
          <div style={{ textAlign: 'center', padding: tokens.space[3], color: tokens.inkMuted, fontSize: 13 }}>
            Configura fees y costes fijos para ver el desglose de inversión.
          </div>
        )}
      </div>

      {/* Campaign breakdown */}
      {data?.campaigns?.length > 0 && <CampaignBreakdown campaigns={data.campaigns} />}

      {/* Funnel metrics — ecommerce funnel + lead generation */}
      {data?.funnel && (
        <div style={{ marginTop: tokens.space[5], padding: tokens.space[4], background: tokens.surface, borderRadius: tokens.radius.md, border: `1px solid ${tokens.border}` }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: tokens.ink, marginBottom: tokens.space[3] }}>Embudo de conversión</h4>

          {data.funnel.views != null && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                { label: 'Vistas', value: data.funnel.views, isFirst: true },
                { label: 'Carritos', value: data.funnel.carts },
                { label: 'Checkouts', value: data.funnel.checkouts },
                { label: 'Compras', value: data.funnel.orders },
              ].map((row, i) => {
                const max = data.funnel.views || 1;
                const pct = Math.round((row.value / max) * 100);
                const dropPct = row.isFirst ? null : Math.round((row.value / max) * 1000) / 10;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: tokens.space[3], padding: `${tokens.space[2]}px 0` }}>
                    <span style={{ width: 100, fontSize: 12, color: tokens.ink, flexShrink: 0 }}>{row.label}</span>
                    <div style={{ flex: 1, height: 8, background: tokens.surfaceAlt, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: tokens.accent, borderRadius: 4, minWidth: 2 }} />
                    </div>
                    <span className="font-num" style={{ fontSize: 12, color: tokens.inkSoft, width: 80, textAlign: 'right', flexShrink: 0 }}>{row.value.toLocaleString('es-ES')}</span>
                    <span className="font-num" style={{ fontSize: 11, color: tokens.inkMuted, width: 55, textAlign: 'right', flexShrink: 0 }}>{dropPct != null ? `${dropPct}%` : '—'}</span>
                  </div>
                );
              })}
              {(data.funnel.cartCloseRate != null || data.funnel.checkoutCompletionRate != null) && (
                <div style={{ display: 'flex', gap: tokens.space[4], flexWrap: 'wrap', marginTop: tokens.space[3], paddingTop: tokens.space[3], borderTop: `1px solid ${tokens.borderSoft}`, fontSize: 12, color: tokens.inkSoft }}>
                  {data.funnel.cartCloseRate != null && (
                    <span>Carrito → compra: <strong className="font-num" style={{ color: tokens.ink }}>{data.funnel.cartCloseRate}%</strong></span>
                  )}
                  {data.funnel.checkoutCompletionRate != null && (
                    <span>Checkout → compra: <strong className="font-num" style={{ color: tokens.ink }}>{data.funnel.checkoutCompletionRate}%</strong></span>
                  )}
                </div>
              )}
            </div>
          )}

          {data.funnel.leads != null && (
            <div style={{
              display: 'flex',
              gap: tokens.space[6],
              marginTop: data.funnel.views != null ? tokens.space[4] : 0,
              paddingTop: data.funnel.views != null ? tokens.space[3] : 0,
              borderTop: data.funnel.views != null ? `1px solid ${tokens.borderSoft}` : 'none',
            }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: tokens.inkMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Leads (Meta)</div>
                <div className="font-num" style={{ fontSize: 18, fontWeight: 600, color: tokens.ink, marginTop: 4 }}>{data.funnel.leads.toLocaleString('es-ES')}</div>
              </div>
              {data.funnel.cpl != null && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: tokens.inkMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>CPL</div>
                  <div className="font-num" style={{ fontSize: 18, fontWeight: 600, color: tokens.ink, marginTop: 4 }}>{data.funnel.cpl.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Flexible YoY comparison */}
      <YoYComparison clientId={clientId} />

      {/* Channel breakdown */}
      {data?.channels?.length > 0 && (
        <div style={{ marginTop: tokens.space[5], padding: tokens.space[4], background: tokens.surface, borderRadius: tokens.radius.md, border: `1px solid ${tokens.border}` }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: tokens.ink, marginBottom: tokens.space[3] }}>Tráfico por canal</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {data.channels.map((ch, i) => {
              const maxSessions = data.channels[0]?.sessions || 1;
              const pct = Math.round((ch.sessions / maxSessions) * 100);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: tokens.space[3], padding: `${tokens.space[2]}px 0` }}>
                  <span style={{ width: 140, fontSize: 12, color: tokens.ink, flexShrink: 0 }}>{ch.channel}</span>
                  <div style={{ flex: 1, height: 8, background: tokens.surfaceAlt, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: tokens.accent, borderRadius: 4, minWidth: 2 }} />
                  </div>
                  <span style={{ fontSize: 12, color: tokens.inkSoft, width: 80, textAlign: 'right', flexShrink: 0 }}>{ch.sessions.toLocaleString('es-ES')}</span>
                  <span style={{ fontSize: 11, color: tokens.inkMuted, width: 50, textAlign: 'right', flexShrink: 0 }}>{ch.conversions} conv</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Narrative section */}
      <NarrativeSection clientId={clientId} narrative={data?.narrative} onRegenerated={fetchReport} />

      {/* YoY section */}
      {data?.yoy ? (
        <div style={{ marginTop: tokens.space[5], padding: tokens.space[4], background: tokens.surface, borderRadius: tokens.radius.md, border: `1px solid ${tokens.border}` }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: tokens.ink, marginBottom: tokens.space[3] }}>Comparación interanual (YoY)</h4>
          {data.yoy.revenue && (
            <YoYRow label="Ingresos" current={data.yoy.revenue.current} previous={data.yoy.revenue.previousYear} change={data.yoy.revenue.changePercent} suffix=" €" />
          )}
          {data.yoy.sessions && (
            <YoYRow label="Sesiones" current={data.yoy.sessions.current} previous={data.yoy.sessions.previousYear} change={data.yoy.sessions.changePercent} suffix="" />
          )}
        </div>
      ) : hasAnyData ? (
        <div style={{ marginTop: tokens.space[5], padding: tokens.space[4], background: tokens.surfaceAlt, borderRadius: tokens.radius.md, border: `1px solid ${tokens.borderSoft}`, textAlign: 'center', color: tokens.inkMuted, fontSize: 13 }}>
          Datos históricos insuficientes para comparación interanual.
        </div>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: tokens.space[2], marginTop: tokens.space[3] }}>
        {sources?.map((s) => (
          <span key={s.integrationId} style={{ fontSize: 11, color: tokens.inkMuted, background: tokens.surfaceAlt, padding: `2px ${tokens.space[2]}px`, borderRadius: tokens.radius.sm }}>
            {s.name} · {s.lastSyncAt ? new Date(s.lastSyncAt).toLocaleDateString('es-ES') : '–'}
          </span>
        ))}
      </div>
      <MissingIntegrationsCTA missing={missing} onNavigateIntegrations={onNavigateIntegrations} />

      {showObjectivesForm && (
        <ObjectivesForm
          clientId={clientId}
          yearMonth={yearMonth}
          onClose={() => setShowObjectivesForm(false)}
          onSaved={fetchReport}
        />
      )}

      {showCostsForm && (
        <CostsForm
          clientId={clientId}
          yearMonth={yearMonth}
          onClose={() => setShowCostsForm(false)}
          onSaved={fetchReport}
        />
      )}
    </div>
  );
}
