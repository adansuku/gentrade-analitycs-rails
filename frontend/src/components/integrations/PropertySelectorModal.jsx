/**
 * PropertySelectorModal — select an item from a list
 * Generic: works for GA4 properties, Meta ad accounts, TikTok advertisers, etc.
 */

import { useMemo, useState } from 'react';

export default function PropertySelectorModal({
  items,
  selectedItem,
  onSelect,
  onConfirm,
  onClose,
  title = 'Selecciona una opción',
  confirmLabel = 'Conectar',
  searchable = false,
  searchPlaceholder = 'Buscar…',
  allowManual = false,
  manualPlaceholder = 'Introduce el ID manualmente',
}) {
  const [query, setQuery] = useState('');
  const [manualValue, setManualValue] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchable) return items;
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const label = String(item.label || '').toLowerCase();
      const id = String(item.id || '').toLowerCase();
      return label.includes(q) || id.includes(q);
    });
  }, [items, query, searchable]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480,
          boxShadow: '0 24px 48px rgba(0,0,0,0.15)', overflow: 'hidden',
        }}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f1f5' }}>
          <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, margin: 0 }}>
            {title}
          </h3>
        </div>

        <div style={{ padding: 24 }}>
          {searchable && items.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid #e5e7eb',
                  background: '#f8f9fb',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {filteredItems.length === 0 && !allowManual ? (
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', textAlign: 'center', padding: 24 }}>
              {items.length === 0 ? 'No se encontraron elementos disponibles.' : 'No hay resultados para tu búsqueda.'}
            </p>
          ) : filteredItems.length === 0 && allowManual ? (
            <div style={{ padding: 8 }}>
              <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: 12 }}>
                Introduce el Customer ID manualmente (formato: 123-456-7890)
              </p>
              <input
                value={manualValue}
                onChange={(e) => { setManualValue(e.target.value); onSelect(e.target.value.replace(/-/g, '')); }}
                placeholder={manualPlaceholder}
                autoFocus
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  border: '1px solid #e5e7eb', background: '#f8f9fb',
                  fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  style={{
                    padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
                    border: selectedItem === item.id ? '2px solid #1b5e3b' : '1px solid #e5e7eb',
                    background: selectedItem === item.id ? '#1b5e3b08' : '#fff',
                    transition: 'all 0.12s',
                  }}
                >
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{item.label}</div>
                  <div style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>{item.id}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{
          padding: '16px 24px', borderTop: '1px solid #f0f1f5',
          display: 'flex', justifyContent: 'flex-end', gap: 10,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: '#f0f1f5', color: '#374151', cursor: 'pointer',
              fontSize: '0.875rem', fontWeight: 500,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={!selectedItem}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: selectedItem ? '#1b5e3b' : '#e5e7eb',
              color: selectedItem ? '#fff' : '#9ca3af',
              cursor: selectedItem ? 'pointer' : 'not-allowed',
              fontSize: '0.875rem', fontWeight: 500,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
