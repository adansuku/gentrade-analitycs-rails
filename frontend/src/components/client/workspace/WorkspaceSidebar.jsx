import { Icons } from '../../ui/Icons';
import { SentimentBadge } from '../../ui/SentimentBadge';
import WorkspaceNav from './WorkspaceNav';
import { tokens } from './tokens';

function Initials({ name }) {
  const initials = (name || 'C')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  return (
    <div
      aria-hidden
      style={{
        width: 44,
        height: 44,
        borderRadius: tokens.radius.md,
        background: tokens.accentSoft,
        color: tokens.accentInk,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: 16,
        letterSpacing: '-0.01em',
        flexShrink: 0,
      }}
    >
      {initials || 'C'}
    </div>
  );
}

function StatRow({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '7px 0' }}>
      <span style={{ fontSize: 12, color: tokens.inkSoft, letterSpacing: '-0.005em' }}>{label}</span>
      <span
        className="font-num"
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: tokens.ink,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function WorkspaceSidebar({
  client,
  sentimentSummary,
  sections,
  activeSection,
  onSectionChange,
  onGenerateProposal,
  generating,
  materialsCount,
  proposalsCount,
  integrationsCount,
  canGenerate,
}) {
  return (
    <aside
      style={{
        width: tokens.sidebarWidth,
        flexShrink: 0,
        background: tokens.surface,
        borderRight: `1px solid ${tokens.border}`,
        boxShadow: tokens.sidebarShadow,
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
        height: '100vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '24px 20px 20px', borderBottom: `1px solid ${tokens.borderSoft}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Initials name={client?.name} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              className="font-display"
              style={{
                fontSize: 16,
                fontWeight: 650,
                color: tokens.ink,
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={client?.name}
            >
              {client?.name || 'Cliente'}
            </div>
            {client?.industry && (
              <div style={{ fontSize: 12, color: tokens.inkMuted, marginTop: 3, letterSpacing: '-0.005em' }}>{client.industry}</div>
            )}
          </div>
        </div>
        {sentimentSummary && sentimentSummary.count > 0 && (
          <div style={{ marginTop: 14 }}>
            <SentimentBadge score={sentimentSummary.averageScore} sentiment={sentimentSummary.dominantSentiment} />
          </div>
        )}
      </div>

      <div style={{ padding: '20px 20px', borderBottom: `1px solid ${tokens.borderSoft}` }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: tokens.inkMuted,
            marginBottom: 8,
          }}
        >
          Contexto
        </div>
        <StatRow label="Materiales" value={materialsCount} />
        <StatRow label="Propuestas" value={proposalsCount} />
        <StatRow label="Integraciones" value={integrationsCount} />
      </div>

      <div style={{ padding: '20px 20px', borderBottom: `1px solid ${tokens.borderSoft}` }}>
        <button
          type="button"
          onClick={onGenerateProposal}
          disabled={generating || !canGenerate}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '12px 14px',
            border: 'none',
            borderRadius: tokens.radius.md,
            background: generating || !canGenerate ? tokens.surfaceAlt : tokens.accent,
            color: generating || !canGenerate ? tokens.inkMuted : '#ffffff',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '-0.005em',
            cursor: generating || !canGenerate ? 'not-allowed' : 'pointer',
            boxShadow: generating || !canGenerate ? 'none' : '0 1px 2px rgba(79, 70, 229, 0.2)',
            transition: 'background 0.12s, transform 0.12s, box-shadow 0.12s',
          }}
          onMouseEnter={(e) => {
            if (!generating && canGenerate) {
              e.currentTarget.style.background = tokens.accentInk;
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(79, 70, 229, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if (!generating && canGenerate) {
              e.currentTarget.style.background = tokens.accent;
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(79, 70, 229, 0.2)';
            }
          }}
        >
          <Icons.Sparkles />
          {generating ? 'Generando…' : 'Generar propuesta'}
        </button>
        {!canGenerate && !generating && (
          <p style={{ margin: '10px 2px 0', fontSize: 11, color: tokens.inkMuted, lineHeight: 1.4 }}>
            Añade al menos un material para poder generar.
          </p>
        )}
      </div>

      <div style={{ padding: '24px 14px', flex: 1 }}>
        <WorkspaceNav
          sections={sections}
          activeSection={activeSection}
          onSectionChange={onSectionChange}
        />
      </div>
    </aside>
  );
}
