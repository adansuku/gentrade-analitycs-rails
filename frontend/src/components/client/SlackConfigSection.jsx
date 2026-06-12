import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import tokens from './workspace/tokens';

export default function SlackConfigSection({ clientId }) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [channelName, setChannelName] = useState('');
  const [sendTime, setSendTime] = useState('08:00');
  const [isEnabled, setIsEnabled] = useState(true);
  const [hasConfig, setHasConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'ok' | 'error'
  const [testStatus, setTestStatus] = useState(null); // { ok, error }
  const [sendNowStatus, setSendNowStatus] = useState(null); // { ok, error }
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/api/clients/${clientId}/slack`)
      .then((data) => {
        setHasConfig(true);
        setChannelName(data.channelName || '');
        setSendTime(data.sendTime || '08:00');
        setIsEnabled(data.isEnabled);
        setWebhookUrl('');
      })
      .catch(() => {
        setHasConfig(false);
      });
  }, [clientId]);

  const handleSave = async () => {
    if (!webhookUrl || webhookUrl === '****') {
      setError('Ingresa la URL del webhook de Slack');
      return;
    }
    setError(null);
    setSaving(true);
    setSaveStatus(null);
    try {
      await api.post(`/api/clients/${clientId}/slack`, {
        webhookUrl,
        channelName: channelName || undefined,
        sendTime,
        isEnabled,
      });
      setHasConfig(true);
      setWebhookUrl('');
      setSaveStatus('ok');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestStatus(null);
    try {
      const result = await api.post(`/api/clients/${clientId}/slack/test`, {});
      setTestStatus(result);
    } catch {
      setTestStatus({ ok: false, error: 'Error al conectar con el servidor' });
    } finally {
      setTesting(false);
    }
  };

  const handleSendNow = async () => {
    setSendingReport(true);
    setSendNowStatus(null);
    try {
      const result = await api.post(`/api/clients/${clientId}/slack/send-now`, {});
      setSendNowStatus(result);
    } catch {
      setSendNowStatus({ ok: false, error: 'Error al conectar con el servidor' });
    } finally {
      setSendingReport(false);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      const result = await api.patch(`/api/clients/${clientId}/slack/toggle`, {});
      setIsEnabled(result.isEnabled);
    } catch {
      // revert optimistic update
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Eliminar la configuración de Slack? Esta acción no se puede deshacer.')) return;
    try {
      await api.del(`/api/clients/${clientId}/slack`);
      setHasConfig(false);
      setWebhookUrl('');
      setChannelName('');
      setSendTime('08:00');
      setIsEnabled(true);
    } catch {
      setError('Error al eliminar la configuración');
    }
  };

  const inputStyle = {
    padding: `${tokens.space[2]}px ${tokens.space[3]}px`,
    borderRadius: tokens.radius.sm,
    border: `1px solid ${tokens.border}`,
    fontSize: 14,
    width: '100%',
    boxSizing: 'border-box',
    background: tokens.surface,
    color: tokens.ink,
  };

  const labelStyle = {
    fontSize: 13,
    color: tokens.inkSoft,
    display: 'block',
    marginBottom: tokens.space[1],
  };

  const btnStyle = (primary, danger) => ({
    padding: `${tokens.space[2]}px ${tokens.space[4]}px`,
    borderRadius: tokens.radius.md,
    border: danger ? `1px solid ${tokens.danger}` : primary ? 'none' : `1px solid ${tokens.border}`,
    background: primary ? tokens.accent : 'transparent',
    color: danger ? tokens.danger : primary ? '#fff' : tokens.ink,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  });

  return (
    <div style={{ marginTop: tokens.space[5] }}>
      <div style={{
        borderTop: `1px solid ${tokens.border}`,
        paddingTop: tokens.space[5],
        marginBottom: tokens.space[4],
      }}>
        <h4 style={{ margin: 0, fontSize: 15, color: tokens.ink, fontWeight: 600 }}>Notificaciones Slack</h4>
        <p style={{ margin: `${tokens.space[1]}px 0 0`, fontSize: 13, color: tokens.inkSoft }}>
          Recibe el reporte diario automáticamente en un canal de Slack. La hora es en UTC (España: UTC+2 en verano → 06:00 UTC para las 08:00).
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space[4], maxWidth: 480 }}>
        <div>
          <label style={labelStyle}>URL del Webhook de Slack</label>
          <input
            type="password"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            style={inputStyle}
            placeholder={hasConfig ? '••••••••• (actualizar para cambiar)' : 'https://hooks.slack.com/services/...'}
            autoComplete="off"
          />
        </div>

        <div>
          <label style={labelStyle}>Nombre del canal (opcional)</label>
          <input
            type="text"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            style={inputStyle}
            placeholder="#reportes-cliente"
          />
        </div>

        <div>
          <label style={labelStyle}>Hora de envío (UTC)</label>
          <input
            type="time"
            value={sendTime}
            onChange={(e) => setSendTime(e.target.value)}
            style={{ ...inputStyle, width: 'auto' }}
          />
        </div>

        {hasConfig && (
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.space[3] }}>
            <button
              onClick={handleToggle}
              disabled={toggling}
              style={{
                ...btnStyle(false),
                background: isEnabled ? tokens.accentSoft : tokens.surfaceAlt,
                color: isEnabled ? tokens.accentInk : tokens.inkMuted,
                border: `1px solid ${isEnabled ? tokens.accent : tokens.border}`,
                opacity: toggling ? 0.6 : 1,
              }}
            >
              {isEnabled ? '● Activo' : '○ Inactivo'}
            </button>
            <span style={{ fontSize: 12, color: tokens.inkMuted }}>
              {isEnabled ? 'Se enviará automáticamente' : 'Envíos pausados'}
            </span>
          </div>
        )}

        {error && (
          <div style={{ fontSize: 13, color: tokens.danger }}>{error}</div>
        )}

        {saveStatus === 'ok' && (
          <div style={{ fontSize: 13, color: '#16a34a' }}>✓ Configuración guardada</div>
        )}

        <div style={{ display: 'flex', gap: tokens.space[2], flexWrap: 'wrap' }}>
          <button onClick={handleSave} disabled={saving} style={btnStyle(true)}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>

          {hasConfig && (
            <button onClick={handleTest} disabled={testing} style={btnStyle(false)}>
              {testing ? 'Enviando...' : 'Enviar prueba'}
            </button>
          )}

          {hasConfig && (
            <button onClick={handleSendNow} disabled={sendingReport} style={btnStyle(false)}>
              {sendingReport ? 'Enviando...' : 'Enviar reporte ahora'}
            </button>
          )}
        </div>

        {testStatus && (
          <div style={{
            fontSize: 13,
            color: testStatus.ok ? '#16a34a' : tokens.danger,
            padding: `${tokens.space[2]}px ${tokens.space[3]}px`,
            borderRadius: tokens.radius.sm,
            background: testStatus.ok ? '#f0fdf4' : '#fef2f2',
          }}>
            {testStatus.ok ? '✓ Mensaje de prueba enviado correctamente' : `✗ Error: ${testStatus.error}`}
          </div>
        )}

        {sendNowStatus && (
          <div style={{
            fontSize: 13,
            color: sendNowStatus.ok ? '#16a34a' : tokens.danger,
            padding: `${tokens.space[2]}px ${tokens.space[3]}px`,
            borderRadius: tokens.radius.sm,
            background: sendNowStatus.ok ? '#f0fdf4' : '#fef2f2',
          }}>
            {sendNowStatus.ok ? '✓ Reporte enviado correctamente' : `✗ Error: ${sendNowStatus.error}`}
          </div>
        )}

        {hasConfig && (
          <button
            onClick={handleDelete}
            style={{ ...btnStyle(false, true), fontSize: 13, padding: `${tokens.space[1]}px 0`, border: 'none', textAlign: 'left', width: 'auto' }}
          >
            Eliminar configuración
          </button>
        )}
      </div>
    </div>
  );
}
