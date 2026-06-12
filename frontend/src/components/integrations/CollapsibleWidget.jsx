/**
 * CollapsibleWidget — wrapper for data widgets with expand/collapse toggle
 */

import { useState } from 'react';
import { Icons } from '../ui/Icons';

export default function CollapsibleWidget({ title, subtitle, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', background: '#f9fafb', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1f2937', whiteSpace: 'nowrap' }}>{title}</span>
          {subtitle && (
            <span style={{ fontSize: '0.75rem', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={subtitle}>
              {subtitle}
            </span>
          )}
        </div>
        <span style={{ color: '#9ca3af', display: 'flex', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          <Icons.ChevronDown size={16} />
        </span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid #f3f4f6' }}>
          {children}
        </div>
      )}
    </div>
  );
}
