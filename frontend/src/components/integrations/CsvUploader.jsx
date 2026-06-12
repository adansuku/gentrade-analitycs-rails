/**
 * CsvUploader — upload CSV files as integration data
 */

import { useState, useRef } from 'react';
import { authFetch } from '../../lib/api';
import { API_BASE } from '../../lib/constants';
import { Icons } from '../ui/Icons';
import { Button } from '@/components/ui/button';

export default function CsvUploader({ clientId, onComplete }) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = sessionStorage.getItem('auth_token');
      const r = await fetch(`${API_BASE}/api/integrations/client/${clientId}/csv`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });

      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || 'Error al subir CSV');
      }

      const data = await r.json();
      setResult(data);
      if (onComplete) onComplete(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid #f0f1f5',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: '#10b98112', color: '#10b981',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icons.Upload />
        </div>
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Importar CSV</div>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Sube un archivo de productos, inventario o ventas</div>
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {/* Upload area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed #e5e7eb', borderRadius: 10,
            padding: '32px 20px', textAlign: 'center',
            cursor: 'pointer', transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#1b5e3b'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
        >
          {uploading ? (
            <div style={{ color: '#6b7280' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>Procesando...</div>
            </div>
          ) : (
            <>
              <Icons.Upload />
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginTop: 8 }}>
                Haz click para seleccionar un CSV
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#9ca3af', marginTop: 4 }}>
                Columnas reconocidas: nombre, precio, stock, categoria, sku
              </div>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.txt"
          onChange={handleUpload}
          style={{ display: 'none' }}
        />

        {/* Error */}
        {error && (
          <div style={{
            marginTop: 12, padding: '10px 14px', borderRadius: 8,
            background: '#fef2f2', color: '#dc2626', fontSize: '0.8125rem',
          }}>
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: '#f0fdf4', color: '#059669', fontSize: '0.875rem', fontWeight: 500,
              marginBottom: 12,
            }}>
              ✓ {result.rowCount} filas importadas
            </div>

            {/* Column mapping */}
            {Object.keys(result.columns || {}).length > 0 && (
              <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: 12 }}>
                <strong>Columnas detectadas:</strong>{' '}
                {Object.entries(result.columns).map(([field, header]) => (
                  <span key={field} style={{
                    display: 'inline-block', margin: '2px 4px',
                    padding: '2px 8px', borderRadius: 6,
                    background: '#f0f1f5', fontSize: '0.75rem',
                  }}>
                    {field} → {header}
                  </span>
                ))}
              </div>
            )}

            {/* Preview table */}
            {result.preview?.length > 0 && (
              <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr>
                      {Object.keys(result.preview[0]).map(col => (
                        <th key={col} style={{
                          padding: '8px 12px', textAlign: 'left', fontWeight: 600,
                          background: '#f8f9fb', borderBottom: '1px solid #e5e7eb',
                          color: '#374151', whiteSpace: 'nowrap',
                        }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.preview.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((val, j) => (
                          <td key={j} style={{
                            padding: '8px 12px', borderBottom: '1px solid #f5f5f7',
                            color: '#111827', whiteSpace: 'nowrap',
                          }}>
                            {val != null ? String(val) : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
