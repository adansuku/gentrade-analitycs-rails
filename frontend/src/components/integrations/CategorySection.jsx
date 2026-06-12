/**
 * CategorySection — collapsible group of IntegrationCards for one category
 * Uses the same visual pattern as CollapsibleWidget for consistent styling
 */

import { useState } from 'react';
import { Icons } from '../ui/Icons';
import IntegrationCard from './IntegrationCard';
import { INTEGRATION_TYPES } from '../../lib/constants';

export default function CategorySection({
  categoryKey,
  categoryLabel,
  integrations,
  syncing,
  onConnect,
  onDisconnect,
  onSync,
  onReconnect,
  onChangeProperty,
}) {
  const typesInCategory = Object.entries(INTEGRATION_TYPES)
    .filter(([, v]) => v.category === categoryKey)
    .map(([key]) => key);

  if (typesInCategory.length === 0) return null;

  const connectedCount = typesInCategory.filter(type =>
    integrations.some(i => i.type === type && i.status === 'connected')
  ).length;

  const [expanded, setExpanded] = useState(connectedCount > 0);

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', background: '#fff', marginBottom: 8 }}>
      {/* Category header — same pattern as CollapsibleWidget */}
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', background: '#f9fafb', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1f2937', whiteSpace: 'nowrap' }}>{categoryLabel}</span>
          <span
            style={{ backgroundColor: '#e5e7eb', color: '#6b7280', fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 999, lineHeight: 1 }}
          >
            {typesInCategory.length}
          </span>
          {connectedCount > 0 && (
            <span
              style={{ backgroundColor: '#d1fae5', color: '#065f46', fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 999, lineHeight: 1 }}
            >
              {connectedCount} conectado{connectedCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <span style={{ color: '#9ca3af', display: 'flex', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          <Icons.ChevronDown size={16} />
        </span>
      </button>

      {/* Cards */}
      {expanded && (
        <div
          style={{
            borderTop: '1px solid #f3f4f6',
            padding: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            background: '#fff',
          }}
        >
          {typesInCategory.map((type) => {
            const integration = integrations.find(i => i.type === type);
            return (
              <IntegrationCard
                key={type}
                type={type}
                status={integration?.status || 'disconnected'}
                lastSync={integration?.lastSyncAt}
                config={integration?.config}
                lastError={integration?.lastError}
                syncing={syncing === integration?.id}
                onConnect={() => onConnect(type)}
                onDisconnect={integration ? () => onDisconnect(integration.id) : undefined}
                onSync={integration?.status === 'connected' ? () => onSync(integration.id) : undefined}
                onReconnect={integration?.status === 'error' ? () => onReconnect(type, integration.id) : undefined}
                onChangeProperty={integration ? () => onChangeProperty?.(type) : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
