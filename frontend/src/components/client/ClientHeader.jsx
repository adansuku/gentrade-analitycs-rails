import { Icons } from '../ui/Icons';
import { tokens } from './workspace/tokens';

export function ClientHeader({ client, onBack, onEditClient }) {
  const contactLine = [client?.company, client?.email, client?.phone].filter(Boolean).join(' · ');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
      <button
        type="button"
        onClick={onBack}
        aria-label="Volver a clientes"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          background: 'transparent',
          border: `1px solid ${tokens.border}`,
          borderRadius: tokens.radius.sm,
          color: tokens.inkSoft,
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <Icons.ArrowLeft />
        <span>Clientes</span>
      </button>

      <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 600,
            color: tokens.ink,
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={client?.name}
        >
          {client?.name || 'Cliente'}
        </h1>
        {contactLine && (
          <span
            style={{
              fontSize: 12,
              color: tokens.inkMuted,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            {contactLine}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onEditClient}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          background: tokens.surface,
          border: `1px solid ${tokens.border}`,
          borderRadius: tokens.radius.sm,
          color: tokens.ink,
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <Icons.Edit />
        <span>Editar</span>
      </button>
    </div>
  );
}

export default ClientHeader;
