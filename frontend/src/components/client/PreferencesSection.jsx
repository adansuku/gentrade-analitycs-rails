import { Icons } from '../ui/Icons';
import { Button } from '@/components/ui/button';
import { formatDate } from '../../lib/formatters';

export function PreferencesSection({
  preferences,
  preferencesLoading,
  newPrefKey,
  setNewPrefKey,
  newPrefValue,
  setNewPrefValue,
  onSavePreference,
}) {
  const inputStyle = {
    padding: '8px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    fontSize: '0.8125rem',
    outline: 'none',
    background: '#fff',
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          value={newPrefKey}
          onChange={(e) => setNewPrefKey(e.target.value)}
          placeholder="Clave (ej. presupuesto_maximo)"
          style={{ ...inputStyle, flex: 1 }}
        />
        <input
          type="text"
          value={newPrefValue}
          onChange={(e) => setNewPrefValue(e.target.value)}
          placeholder="Valor"
          style={{ ...inputStyle, flex: 1 }}
        />
        <Button
          onClick={onSavePreference}
          disabled={!newPrefKey.trim()}
          style={{
            background: !newPrefKey.trim() ? '#e5e7eb' : '#1b5e3b',
            color: !newPrefKey.trim() ? '#9ca3af' : '#fff',
            border: 'none',
            fontWeight: 600,
            padding: '8px 14px',
            fontSize: '0.8125rem',
            borderRadius: 8,
          }}
        >
          <Icons.Check /> Guardar
        </Button>
      </div>

      {preferencesLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }}>
          <div style={{ height: 12, background: '#f3f4f6', borderRadius: 6, width: '100%' }} />
          <div style={{ height: 12, background: '#f3f4f6', borderRadius: 6, width: '60%' }} />
        </div>
      ) : preferences.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: '#9ca3af' }}>
          <div style={{ marginBottom: 8 }}><Icons.Settings /></div>
          <p style={{ fontWeight: 600, color: '#6b7280', margin: '0 0 4px' }}>Sin preferencias</p>
          <span style={{ fontSize: '0.8125rem' }}>
            Anade preferencias como presupuesto maximo, contacto preferido, etc.
          </span>
        </div>
      ) : (
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f0f1f5' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#9ca3af', fontWeight: 500 }}>Clave</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#9ca3af', fontWeight: 500 }}>Valor</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#9ca3af', fontWeight: 500 }}>Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {preferences.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f8f9fb' }}>
                  <td style={{ padding: '10px 12px', color: '#111827', fontWeight: 600 }}>{p.key}</td>
                  <td style={{ padding: '10px 12px', color: '#6b7280' }}>{p.value}</td>
                  <td style={{ padding: '10px 12px', color: '#9ca3af' }}>{formatDate(p.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
