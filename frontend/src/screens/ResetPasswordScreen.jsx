import { useState, useEffect } from 'react';
import { Icons } from '../components/ui/Icons';
import { APP_NAME } from '../lib/constants';

export function ResetPasswordScreen({ theme, toggleTheme }) {
  // Extract token from URL path manually since we're not using <Routes>
  const token = window.location.pathname.split('/reset-password/')[1];
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    // Could validate token on mount, but we'll do it on submit for simplicity
    setValidating(false);
    setTokenValid(true);
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al restablecer contraseña');
      }

      setSuccess(true);
      setTimeout(() => window.location.href = '/login', 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1b5e3b 0%, #2a7d54 50%, #5a9d7c 100%)',
      }}>
        <div style={{ color: 'white', fontSize: '1.2rem' }}>Validando enlace...</div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1b5e3b 0%, #2a7d54 50%, #5a9d7c 100%)',
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 24px 48px rgba(0,0,0,0.15)',
          maxWidth: 400,
          width: '90%',
          margin: '0 16px',
          padding: '40px 32px',
          textAlign: 'center',
        }}>
          <h2 style={{ color: '#dc2626', marginBottom: 16 }}>Enlace Inválido</h2>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>
            El enlace de restablecimiento es inválido o ha expirado.
          </p>
          <a
            href="/forgot-password"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: '#1b5e3b',
              color: 'white',
              borderRadius: 8,
              textDecoration: 'none',
            }}
          >
            Solicitar nuevo enlace
          </a>
        </div>
      </div>
    );
  }

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
          Nueva Contraseña
        </h2>

        <p style={{
          fontSize: '0.9rem',
          color: '#6b7280',
          margin: '0 0 28px 0',
          textAlign: 'center',
        }}>
          {success
            ? 'Contraseña restablecida correctamente'
            : 'Ingresa tu nueva contraseña'}
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
              Tu contraseña ha sido restablecida. Redirigiendo al login...
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
              Ir al login
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <div style={{ marginBottom: 12 }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nueva contraseña"
                autoFocus
                required
                minLength={8}
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

            <div style={{ marginBottom: 16 }}>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmar contraseña"
                required
                minLength={8}
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

            <p style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginBottom: 16,
            }}>
              La contraseña debe tener al menos 8 caracteres
            </p>

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
              }}
            >
              {loading ? 'Restableciendo...' : 'Restablecer Contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPasswordScreen;
