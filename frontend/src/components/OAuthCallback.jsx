import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    type: params.get('type'),
    email: params.get('email'),
    agencyAccountId: params.get('agencyAccountId'),
    clientId: params.get('clientId'),
    message: params.get('message'),
  };
}

export default function OAuthCallback() {
  useEffect(() => {
    const { type, email, agencyAccountId, clientId, message } = getQueryParams();

    const payload = type === 'oauth-error'
      ? { type: 'oauth-error', message: message || 'Error de autorización' }
      : { type, email, agencyAccountId, clientId };

    try { window.opener && window.opener.postMessage(payload, '*'); } catch {}
    try {
      const ch = new BroadcastChannel('gentrade-oauth');
      ch.postMessage(payload);
      ch.close();
    } catch {}
    try {
      localStorage.setItem('gentrade-oauth-last', JSON.stringify({ payload, ts: Date.now() }));
    } catch {}

    setTimeout(() => window.close(), 300);
  }, []);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', fontFamily: 'sans-serif', color: '#555', fontSize: 14,
    }}>
      <p>Conectado. Cerrando ventana…</p>
    </div>
  );
}
