import { useState } from 'react';
import { Icons } from '../components/ui/Icons';
import { APP_NAME, APP_TAGLINE } from '../lib/constants';

export function LoginScreen({ onLogin, theme, toggleTheme, onBack }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = await onLogin(username, password);
    if (!success) {
      setError('Credenciales invalidas');
      setLoading(false);
    }
  };

  const inputStyle = (field) => ({
    width: '100%',
    padding: '12px 16px',
    borderRadius: 8,
    border: focusedField === field ? '1px solid #1b5e3b' : '1px solid #e5e7eb',
    background: '#f8f9fb',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease',
  });

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1b5e3b 0%, #2a7d54 50%, #5a9d7c 100%)',
      position: 'relative',
    }}>
      <button
        onClick={toggleTheme}
        aria-label="Cambiar tema"
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'rgba(255,255,255,0.15)',
          border: 'none',
          borderRadius: 8,
          padding: 8,
          cursor: 'pointer',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {theme === 'dark' ? <Icons.Sun /> : <Icons.Moon />}
      </button>

      <div style={{
        background: '#ffffff',
        borderRadius: 16,
        boxShadow: '0 24px 48px rgba(0,0,0,0.15)',
        maxWidth: 400,
        width: '100%',
        margin: '0 16px',
        padding: '40px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <div style={{ marginBottom: 24 }}>
          <img src="/logo.svg" alt={APP_NAME} style={{ height: 80 }} />
        </div>

        <p style={{
          fontSize: '0.9rem',
          color: '#9ca3af',
          margin: '0 0 28px 0',
        }}>
          {APP_TAGLINE}
        </p>

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div style={{ marginBottom: 12 }}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Usuario"
              autoFocus
              required
              style={inputStyle('username')}
              onFocus={() => setFocusedField('username')}
              onBlur={() => setFocusedField(null)}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contrasena"
              required
              style={inputStyle('password')}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />
          </div>

          {error && (
            <div style={{
              background: '#fef2f2',
              color: '#dc2626',
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: '0.85rem',
              marginBottom: 16,
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 8,
              background: loading ? '#5a9d7c' : '#1b5e3b',
              color: '#ffffff',
              fontSize: '0.95rem',
              fontWeight: 600,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s ease',
              marginBottom: 12,
            }}
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>

          <a
            href="/forgot-password"
            style={{
              display: 'block',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '0.875rem',
              textDecoration: 'underline',
            }}
          >
            ¿Olvidaste tu contraseña?
          </a>
        </form>

        {onBack && (
          <button
            onClick={onBack}
            style={{
              marginTop: 12,
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: '0.85rem',
              textDecoration: 'underline',
            }}
          >
            Volver a la landing
          </button>
        )}
      </div>
    </div>
  );
}

export default LoginScreen;
