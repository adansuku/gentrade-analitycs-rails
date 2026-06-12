import { useState, useEffect, useRef } from 'react';
import { Icons } from '../components/ui/Icons';
import { Button } from '@/components/ui/button';
import { API_BASE } from '../lib/constants.js';
import { authFetch } from '../lib/api.js';
import CronsPanel from '../components/logs/CronsPanel';

export function LogsScreen() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');
  const [connected, setConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef(null);

  useEffect(() => {
    // Load stats
    authFetch(`${API_BASE}/api/logs/stats`).then(r => r.json()).then(setStats).catch(() => {});

    // Load initial logs
    authFetch(`${API_BASE}/api/logs?limit=100`)
      .then(r => r.json())
      .then(data => { setLogs(data.logs || []); setConnected(true); })
      .catch(() => setConnected(false));

    // Poll for new logs every 2 seconds
    const interval = setInterval(async () => {
      try {
        const r = await authFetch(`${API_BASE}/api/logs?limit=50`);
        const data = await r.json();
        setLogs(prev => {
          const existingIds = new Set(prev.map(l => l.id));
          const newLogs = (data.logs || []).filter(l => !existingIds.has(l.id));
          if (newLogs.length === 0) return prev;
          const merged = [...prev, ...newLogs.reverse()];
          return merged.slice(-200);
        });
        setConnected(true);
      } catch { setConnected(false); }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (autoScroll) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs.length, autoScroll]);

  const filtered = filter === 'all' ? logs : logs.filter(l => l.level === filter);

  const levelBadgeStyles = {
    debug: { background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' },
    info: { background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' },
    warn: { background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' },
    error: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
    llm: { background: '#faf5ff', color: '#9333ea', border: '1px solid #e9d5ff' },
  };

  const filterButtons = [
    { key: 'all', label: 'Todos' },
    { key: 'llm', label: 'LLM' },
    { key: 'info', label: 'INFO' },
    { key: 'warn', label: 'WARN' },
    { key: 'error', label: 'ERROR' },
  ];

  const llmCalls = stats?.lastHour?.llmCalls ?? 0;
  const totalTokens = stats?.lastHour?.totalTokens ?? 0;

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      {/* Hero header */}
      <div style={{
        background: 'linear-gradient(135deg, #1b5e3b 0%, #0f4a2a 50%, #0a2f1c 100%)',
        padding: '40px 32px 48px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -40, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -80, left: '30%', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 8 }}>
            Monitoreo
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <h1 style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', margin: 0, lineHeight: 1.2 }}>
              Logs
            </h1>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: connected ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              border: connected ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(239,68,68,0.3)',
              borderRadius: 20, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600,
              color: connected ? '#86efac' : '#fca5a5',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#22c55e' : '#ef4444' }} />
              {connected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9375rem', marginBottom: 28, maxWidth: 480 }}>
            {llmCalls} llamadas LLM · {totalTokens.toLocaleString()} tokens en la ultima hora.
          </p>
        </div>
      </div>

      {/* Filter bar — overlapping hero */}
      <div style={{ maxWidth: 1100, margin: '-24px auto 0', padding: '0 32px', position: 'relative', zIndex: 2 }}>
        <div style={{
          background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {filterButtons.map(f => {
              const isActive = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
                    border: isActive ? '1px solid #1b5e3b' : '1px solid #e5e7eb',
                    background: isActive ? '#1b5e3b' : '#f9fafb',
                    color: isActive ? '#fff' : '#6b7280',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
              {filtered.length} entrada{filtered.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setLogs([])}
              style={{
                padding: '5px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 500,
                border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              }}
              title="Limpiar logs"
            >
              <Icons.Trash />
            </button>
          </div>
        </div>
      </div>

      {/* Crons panel */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 32px 0' }}>
        <CronsPanel />
      </div>

      {/* Logs content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 32px 48px' }}>
        <div style={{
          background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
          overflow: 'hidden',
        }}>
          {filtered.length === 0 ? (
            <div style={{
              padding: '64px 24px', textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            }}>
              <div style={{ color: '#d1d5db' }}>
                <Icons.List />
              </div>
              <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#374151' }}>
                Sin logs aun
              </p>
              <span style={{ margin: 0, fontSize: '0.8rem', color: '#9ca3af' }}>
                Los logs aparecen en tiempo real al usar la app
              </span>
            </div>
          ) : (
            <div style={{
              maxHeight: 'calc(100vh - 340px)', overflow: 'auto',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
              fontSize: '0.8rem', lineHeight: 1.7,
            }}>
              {filtered.map((log, i) => {
                const badge = levelBadgeStyles[log.level] || levelBadgeStyles.debug;
                return (
                  <div
                    key={log.id}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '8px 16px',
                      borderBottom: '1px solid #f3f4f6',
                      background: i % 2 === 0 ? '#fff' : '#fafbfc',
                      transition: 'background 0.1s',
                    }}
                  >
                    {/* Timestamp */}
                    <span style={{
                      color: '#9ca3af', fontSize: '0.75rem', fontWeight: 500,
                      minWidth: 70, flexShrink: 0, paddingTop: 2,
                      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                    }}>
                      {new Date(log.timestamp).toLocaleTimeString('es-ES')}
                    </span>

                    {/* Level badge */}
                    <span style={{
                      display: 'inline-block', padding: '1px 8px', borderRadius: 6,
                      fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.04em', minWidth: 42, textAlign: 'center',
                      flexShrink: 0, marginTop: 1,
                      ...badge,
                    }}>
                      {log.level}
                    </span>

                    {/* Category */}
                    {log.category && (
                      <span style={{
                        color: '#6b7280', fontSize: '0.75rem', fontWeight: 600,
                        flexShrink: 0, paddingTop: 2,
                      }}>
                        [{log.category}]
                      </span>
                    )}

                    {/* Message */}
                    <span style={{
                      color: '#111827', flex: 1, wordBreak: 'break-word', paddingTop: 2,
                    }}>
                      {log.message}
                    </span>

                    {/* Meta: tokens */}
                    {log.meta?.tokens && (
                      <span style={{
                        color: '#9333ea', fontSize: '0.7rem', fontWeight: 600,
                        background: '#faf5ff', border: '1px solid #e9d5ff',
                        borderRadius: 6, padding: '1px 7px', flexShrink: 0, marginTop: 1,
                      }}>
                        {log.meta.tokens.toLocaleString()} tok
                      </span>
                    )}

                    {/* Meta: duration */}
                    {log.meta?.duration && (
                      <span style={{
                        color: '#6b7280', fontSize: '0.7rem', fontWeight: 500,
                        background: '#f3f4f6', border: '1px solid #e5e7eb',
                        borderRadius: 6, padding: '1px 7px', flexShrink: 0, marginTop: 1,
                      }}>
                        {(log.meta.duration / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                );
              })}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LogsScreen;
