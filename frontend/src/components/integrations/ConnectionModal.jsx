/**
 * ConnectionModal — generic API-key / credentials connection dialog
 * Used by: Mailchimp, Klaviyo, HubSpot, Pipedrive, Stripe, PayPal,
 *          WooCommerce, Shopify, Holded, PrestaShop, PageSpeed
 */

import { useState } from 'react';

export default function ConnectionModal({
  isOpen,
  onClose,
  onConnect,
  typeName,
  typeColor = '#1b5e3b',
  fields = [],
  connecting = false,
  error = null,
}) {
  const [values, setValues] = useState({});

  if (!isOpen) return null;

  const isRequiredFilled = fields
    .filter(f => f.required)
    .every(f => (values[f.name] || '').trim().length > 0);

  function handleChange(name, value) {
    setValues(prev => ({ ...prev, [name]: value }));
  }

  function handleSubmit() {
    if (!isRequiredFilled || connecting) return;
    onConnect(values);
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    background: '#f8f9fb',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: 500,
    marginBottom: 6,
    color: '#374151',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16,
          width: '100%', maxWidth: 440,
          boxShadow: '0 24px 48px rgba(0,0,0,0.15)', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #f0f1f5',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%', background: typeColor,
            }} />
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, margin: 0 }}>
              Conectar {typeName}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none', background: 'none', cursor: 'pointer',
              color: '#9ca3af', fontSize: '1.25rem', lineHeight: 1,
              padding: 4, borderRadius: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {fields.map(field => (
            <div key={field.name}>
              <label style={labelStyle}>
                {field.label}
                {field.required && <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>}
              </label>
              <input
                type={field.type || 'text'}
                value={values[field.name] || ''}
                onChange={e => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder || ''}
                style={inputStyle}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>
          ))}

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: '#fef2f2', color: '#dc2626', fontSize: '0.8125rem',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #f0f1f5',
          display: 'flex', justifyContent: 'flex-end', gap: 10,
        }}>
          <button
            onClick={onClose}
            disabled={connecting}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: '#f0f1f5', color: '#374151',
              cursor: connecting ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem', fontWeight: 500,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isRequiredFilled || connecting}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: isRequiredFilled && !connecting ? typeColor : '#e5e7eb',
              color: isRequiredFilled && !connecting ? '#fff' : '#9ca3af',
              cursor: isRequiredFilled && !connecting ? 'pointer' : 'not-allowed',
              fontSize: '0.875rem', fontWeight: 500,
            }}
          >
            {connecting ? 'Conectando...' : 'Conectar'}
          </button>
        </div>
      </div>
    </div>
  );
}
