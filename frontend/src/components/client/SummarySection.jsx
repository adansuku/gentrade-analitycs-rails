import { Icons } from '../ui/Icons';

const COLORS = {
  green:    '#1b5e3b',
  green2:   '#2a7d54',
  greenLt:  '#eaf3ed',
  greenMid: '#c5dece',
  gold:     '#c8963a',
  goldDk:   '#a87a1f',
  goldLt:   '#faf3e4',
  cream:    '#f7f4ef',
  cream2:   '#edeae3',
  ink:      '#111210',
  ink2:     '#3c3d38',
  ink3:     '#86877f',
  border:   'rgba(17, 18, 16, 0.08)',
};

function formatRelative(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  const days = Math.floor(diffMs / day);
  if (days < 1) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  if (days < 30) return `hace ${Math.floor(days / 7)} sem`;
  if (days < 365) return `hace ${Math.floor(days / 30)} meses`;
  return `hace ${Math.floor(days / 365)} años`;
}

function lastActivityIso({ lastMaterialAt, lastProposalAt }) {
  const candidates = [lastMaterialAt, lastProposalAt].filter(Boolean).map(d => new Date(d).getTime());
  if (!candidates.length) return null;
  return new Date(Math.max(...candidates)).toISOString();
}

function KpiCard({ label, value, sublabel, accent = COLORS.green }) {
  return (
    <div style={{
      flex: '1 1 0', minWidth: 160,
      background: '#fff', borderRadius: 12,
      border: `1px solid ${COLORS.border}`,
      padding: '16px 18px',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <span style={{
        fontSize: '0.6875rem', color: COLORS.ink3, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: '1.75rem', fontWeight: 600, color: accent, lineHeight: 1,
      }}>
        {value}
      </span>
      {sublabel && (
        <span style={{ fontSize: '0.75rem', color: COLORS.ink3, marginTop: 2 }}>{sublabel}</span>
      )}
    </div>
  );
}

function QuickAction({ icon, label, onClick, disabled, primary }) {
  const isPrimary = !!primary;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: '1 1 0', minWidth: 160,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        padding: '14px 18px',
        background: isPrimary ? COLORS.green : '#fff',
        color: isPrimary ? '#fff' : COLORS.ink,
        border: isPrimary ? 'none' : `1px solid ${COLORS.border}`,
        borderRadius: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        fontWeight: 600, fontSize: '0.875rem',
        boxShadow: isPrimary ? '0 2px 12px rgba(27, 94, 59, 0.25)' : 'none',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = isPrimary ? '#0f4a2a' : COLORS.cream;
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = isPrimary ? COLORS.green : '#fff';
      }}
    >
      <span style={{ display: 'inline-flex', color: isPrimary ? '#fff' : COLORS.green }}>{icon}</span>
      {label}
    </button>
  );
}

export function SummarySection({
  client,
  executiveSummary,
  summaryLoading,
  summaryExpanded,
  setSummaryExpanded,
  onRegenerateSummary,
  integrationHighlights = [],
  materialsCount = 0,
  proposalsCount = 0,
  purchasesCount = 0,
  lastMaterialAt,
  lastProposalAt,
  onNavigateSection,
  onGenerateProposal,
  generating,
}) {
  const lastActivity = lastActivityIso({ lastMaterialAt, lastProposalAt });
  const canGenerate = materialsCount > 0 && !generating;

  return (
    <>
      {/* KPI HEADER */}
      <div style={{ maxWidth: 1100, margin: '20px auto 0', padding: '0 32px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <KpiCard
            label="Materiales"
            value={materialsCount}
            sublabel={materialsCount === 0 ? 'Sube el primero' : `${materialsCount === 1 ? '1 archivo' : `${materialsCount} archivos`}`}
            accent={COLORS.green}
          />
          <KpiCard
            label="Propuestas"
            value={proposalsCount}
            sublabel={proposalsCount === 0 ? 'Aún sin generar' : 'Generadas con IA'}
            accent={COLORS.green2}
          />
          <KpiCard
            label="Compras"
            value={purchasesCount}
            sublabel={purchasesCount === 0 ? 'Sin histórico' : 'Histórico registrado'}
            accent={COLORS.goldDk}
          />
          <KpiCard
            label="Última actividad"
            value={formatRelative(lastActivity)}
            sublabel={lastActivity ? new Date(lastActivity).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : 'Sin actividad'}
            accent={COLORS.ink}
          />
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div style={{ maxWidth: 1100, margin: '16px auto 0', padding: '0 32px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <QuickAction
            primary
            icon={<Icons.Sparkles />}
            label={generating ? 'Generando…' : 'Nueva propuesta'}
            onClick={() => onGenerateProposal?.()}
            disabled={!canGenerate}
          />
          <QuickAction
            icon={<Icons.Upload />}
            label="Subir material"
            onClick={() => onNavigateSection?.('materials')}
          />
          <QuickAction
            icon={<Icons.FileText />}
            label="Ver propuestas"
            onClick={() => onNavigateSection?.('proposals')}
            disabled={proposalsCount === 0}
          />
          <QuickAction
            icon={<Icons.ShoppingCart />}
            label="Compras"
            onClick={() => onNavigateSection?.('purchases')}
          />
        </div>
      </div>

      {/* INTEGRATION HIGHLIGHTS (if any) */}
      {integrationHighlights.length > 0 && (
        <div style={{ maxWidth: 1100, margin: '20px auto 0', padding: '0 32px' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {integrationHighlights.map((h, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: 10, border: `1px solid ${COLORS.border}`,
                padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 130,
              }}>
                <span style={{ fontSize: '0.6875rem', color: COLORS.ink3, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h.label}</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: h.color || COLORS.ink }}>{h.value}</span>
                {h.subtitle && <span style={{ fontSize: '0.6875rem', color: COLORS.ink3 }}>{h.subtitle}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EXECUTIVE SUMMARY */}
      <div style={{ maxWidth: 1100, margin: '20px auto 0', padding: '0 32px' }}>
        <div style={{
          background: '#fff', borderRadius: 12, border: `1px solid ${COLORS.border}`,
          overflow: 'hidden',
        }}>
          <div
            onClick={() => setSummaryExpanded(!summaryExpanded)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', cursor: 'pointer',
              borderBottom: summaryExpanded ? `1px solid ${COLORS.cream2}` : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: COLORS.green }}><Icons.Sparkles /></span>
              <strong style={{ fontSize: '0.875rem', color: COLORS.ink }}>Resumen ejecutivo</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={(e) => { e.stopPropagation(); onRegenerateSummary(); }}
                disabled={summaryLoading}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: 'none', border: `1px solid ${COLORS.border}`, borderRadius: 6,
                  padding: '4px 10px', fontSize: '0.75rem', color: COLORS.ink2, cursor: 'pointer',
                  opacity: summaryLoading ? 0.5 : 1,
                }}
              >
                <Icons.RefreshCw />
                Regenerar
              </button>
              <span style={{
                display: 'inline-flex', transition: 'transform 0.2s',
                transform: summaryExpanded ? 'rotate(180deg)' : 'rotate(0deg)', color: COLORS.ink3,
              }}>
                <Icons.ChevronDown />
              </span>
            </div>
          </div>
          {summaryExpanded && (
            <div style={{ padding: '16px 20px' }}>
              {summaryLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ height: 12, background: COLORS.cream2, borderRadius: 6, width: '100%' }} />
                  <div style={{ height: 12, background: COLORS.cream2, borderRadius: 6, width: '60%' }} />
                  <div style={{ height: 12, background: COLORS.cream2, borderRadius: 6, width: '80%' }} />
                </div>
              ) : executiveSummary?.summary ? (
                <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: COLORS.ink2, margin: 0 }}>
                  {executiveSummary.summary}
                </p>
              ) : (
                <p style={{ fontSize: '0.875rem', color: COLORS.ink3, margin: 0 }}>
                  {materialsCount === 0
                    ? 'Sube algún material y vuelve aquí para generar un resumen con IA.'
                    : 'Pulsa "Regenerar" para generar el resumen ejecutivo con IA.'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
