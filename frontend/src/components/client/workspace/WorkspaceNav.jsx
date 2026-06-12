import { tokens } from './tokens';

const GROUP_LABELS = {
  knowledge: 'Conocimiento',
  signals: 'Señales',
  action: 'Acción',
};

const GROUP_ORDER = ['knowledge', 'signals', 'action'];

function NavItem({ section, isActive, onClick }) {
  const Icon = section.icon || null;
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-current={isActive ? 'page' : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: '9px 12px 9px 14px',
          border: 'none',
          borderRadius: tokens.radius.sm,
          background: isActive ? tokens.accentSoft : 'transparent',
          color: isActive ? tokens.accentInk : tokens.inkSoft,
          fontSize: 13,
          fontWeight: isActive ? 600 : 500,
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 0.12s, color 0.12s',
          position: 'relative',
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.background = tokens.surfaceHover;
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.background = 'transparent';
        }}
        onFocus={(e) => {
          e.currentTarget.style.outline = `2px solid ${tokens.accent}`;
          e.currentTarget.style.outlineOffset = '2px';
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = 'none';
        }}
      >
        {isActive && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              top: 8,
              bottom: 8,
              width: 3,
              borderRadius: '0 2px 2px 0',
              background: tokens.accent,
            }}
          />
        )}
        {Icon && (
          <span
            style={{
              display: 'inline-flex',
              color: isActive ? tokens.accent : tokens.inkMuted,
              transition: 'color 0.12s',
            }}
          >
            <Icon />
          </span>
        )}
        <span style={{ flex: 1 }}>{section.label}</span>
        {section.count != null && section.count > 0 && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 20,
              height: 18,
              padding: '0 6px',
              borderRadius: 9,
              fontSize: 11,
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              background: isActive ? '#ffffff' : tokens.surfaceAlt,
              color: isActive ? tokens.accentInk : tokens.inkSoft,
              border: `1px solid ${tokens.border}`,
            }}
          >
            {section.count}
          </span>
        )}
      </button>
    </li>
  );
}

export default function WorkspaceNav({ sections = [], activeSection, onSectionChange }) {
  const grouped = GROUP_ORDER.map((group) => ({
    group,
    label: GROUP_LABELS[group],
    items: sections.filter((s) => s.group === group),
  })).filter((g) => g.items.length > 0);

  return (
    <nav aria-label="Secciones del cliente" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {grouped.map(({ group, label, items }) => (
        <div key={group}>
          <h3
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: tokens.inkMuted,
              margin: '0 0 8px 14px',
            }}
          >
            {label}
          </h3>
          <ul role="list" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {items.map((section) => (
              <NavItem
                key={section.key}
                section={section}
                isActive={section.key === activeSection}
                onClick={() => onSectionChange(section.key)}
              />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
