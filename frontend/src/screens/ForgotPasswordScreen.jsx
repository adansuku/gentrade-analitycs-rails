import { useState } from 'react';
import { Icons } from '../components/ui/Icons';
import { APP_NAME } from '../lib/constants';

export function ForgotPasswordScreen({ theme, toggleTheme }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al solicitar restablecimiento');
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1b5e3b 0%, #2a7d54 50%, #5a9d7c 100%)',
      position: 'relative',
    }}>
      {toggleTheme && (
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
      )}

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

        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 600,
          margin: '0 0 8px 0',
          color: '#1b5e3b',
        }}>
          ¿Olvidaste tu contraseña?
        </h2>

        <p style={{
          fontSize: '0.9rem',
          color: '#6b7280',
          margin: '0 0 28px 0',
          textAlign: 'center',
        }}>
          {success
            ? 'Revisa tu correo electrónico'
            : 'Ingresa tu email y te enviaremos un enlace para restablecerla'}
        </p>

        {success ? (
          <div style={{ width: '100%' }}>
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #86efac',
              color: '#16a34a',
              padding: '12px 16px',
              borderRadius: 8,
              fontSize: '0.875rem',
              marginBottom: 20,
              textAlign: 'center',
            }}>
              Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.
            </div>

            <a
              href="/login"
              style={{
                display: 'block',
                width: '100%',
                padding: '12px 16px',
                borderRadius: 8,
                background: '#1b5e3b',
                color: '#ffffff',
                fontSize: '0.95rem',
                fontWeight: 600,
                border: 'none',
                textAlign: 'center',
                textDecoration: 'none',
                boxSizing: 'border-box',
              }}
            >
              Volver al login
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <div style={{ marginBottom: 16 }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                autoFocus
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  background: '#f8f9fb',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
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
              {loading ? 'Enviando...' : 'Enviar enlace de restablecimiento'}
            </button>

            <a
              href="/login"
              style={{
                display: 'block',
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '0.875rem',
                textDecoration: 'underline',
              }}
            >
              Volver al login
            </a>
          </form>
        )}
      </div>
    </div>
  );
}

export default ForgotPasswordScreen;
