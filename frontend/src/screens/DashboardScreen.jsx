import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Icons from '../components/ui/Icons';
import SentimentBadge from '../components/ui/SentimentBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function DashboardScreen({ onOpenClient }) {
  const navigate = useNavigate();
  const { clients, dashboardData } = useApp();
  const priorityClients = dashboardData?.priorityClients || [];
  const needsAttention = dashboardData?.needsAttention || [];
  const totals = dashboardData?.totals || {};

  const statItems = [
    { value: totals.clients ?? clients.length, label: 'Clientes', icon: Icons.Users, trend: '+2 este mes' },
    { value: totals.proposals ?? 0, label: 'Propuestas', icon: Icons.FileText, trend: null },
    { value: totals.materials ?? 0, label: 'Materiales', icon: Icons.Upload, trend: null },
    { value: totals.proposalsThisMonth ?? 0, label: 'Este mes', icon: Icons.TrendingUp, trend: null },
  ];

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #1b5e3b 0%, #0f4a2a 50%, #0a2f1c 100%)',
        padding: '40px 32px 48px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: -60, right: -40,
          width: 260, height: 260, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
        }} />
        <div style={{
          position: 'absolute', bottom: -80, left: '30%',
          width: 200, height: 200, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
        }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 8 }}>
            Panel comercial
          </div>
          <h1 style={{
            color: '#fff', fontSize: '1.75rem', fontWeight: 700,
            letterSpacing: '-0.03em', marginBottom: 8, lineHeight: 1.2,
          }}>
            Buenos dias 👋
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9375rem', marginBottom: 28, maxWidth: 480 }}>
            Tienes {totals.proposals ?? 0} propuestas activas y {priorityClients.length} clientes en seguimiento.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button
              onClick={() => navigate('/clientes')}
              style={{ background: '#fff', color: '#1b5e3b', border: 'none', fontWeight: 600 }}
            >
              <Icons.Plus /> Nueva propuesta
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/pipeline')}
              style={{ color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <Icons.Columns /> Ver pipeline
            </Button>
          </div>
        </div>
      </div>

      {/* Stats bar — overlapping hero */}
      <div style={{ maxWidth: 1100, margin: '-24px auto 0', padding: '0 32px', position: 'relative', zIndex: 2 }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1,
          background: '#e5e7eb', borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}>
          {statItems.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} style={{
                background: '#fff', padding: '20px 24px',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: i === 0 ? '#1b5e3b10' : i === 1 ? '#05966910' : i === 2 ? '#d9770610' : '#2a7d5410',
                  color: i === 0 ? '#1b5e3b' : i === 1 ? '#059669' : i === 2 ? '#d97706' : '#2a7d54',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon />
                </div>
                <div>
                  <div style={{
                    fontSize: '1.625rem', fontWeight: 700, lineHeight: 1.1,
                    letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums',
                  }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#6b7280', fontWeight: 500, marginTop: 2 }}>
                    {s.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: 1100, margin: '0 auto', padding: '32px 32px 48px',
        display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start',
      }}>
        {/* Left: Clients */}
        <div style={{
          background: '#fff', borderRadius: 12,
          border: '1px solid #e5e7eb', overflow: 'hidden',
        }}>
          <div style={{
            padding: '20px 24px', borderBottom: '1px solid #f0f1f5',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 2 }}>Clientes prioritarios</h2>
              <p style={{ fontSize: '0.8125rem', color: '#6b7280' }}>Ordenados por sentimiento</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/clientes')} style={{ color: '#1b5e3b', fontWeight: 500 }}>
              Ver todos →
            </Button>
          </div>

          {priorityClients.length > 0 ? (
            <div>
              {priorityClients.slice(0, 6).map((c, i) => (
                <div
                  key={c.id}
                  onClick={() => onOpenClient(c)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 24px', cursor: 'pointer',
                    borderBottom: i < Math.min(priorityClients.length, 6) - 1 ? '1px solid #f5f5f7' : 'none',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8f9fb'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: `hsl(${(c.name?.charCodeAt(0) || 0) * 37 % 360}, 55%, 92%)`,
                      color: `hsl(${(c.name?.charCodeAt(0) || 0) * 37 % 360}, 55%, 40%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8125rem', fontWeight: 700, flexShrink: 0,
                    }}>
                      {c.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>{c.name}</div>
                      <div style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>{c.company || 'Sin empresa'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {c.sentiment && <SentimentBadge score={c.sentiment.score} sentiment={c.sentiment.sentiment} size="small" />}
                    <span style={{
                      fontSize: '0.75rem', color: '#6b7280', fontWeight: 500,
                      background: '#f0f1f5', padding: '3px 8px', borderRadius: 6,
                    }}>
                      {c.proposalCount} prop.
                    </span>
                    <Icons.ArrowRight />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              padding: '60px 24px', textAlign: 'center', color: '#9ca3af',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: '#f0f1f5', margin: '0 auto 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icons.Users />
              </div>
              <p style={{ fontSize: '0.9375rem', fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                Sin clientes todavia
              </p>
              <p style={{ fontSize: '0.8125rem', marginBottom: 20 }}>
                Crea tu primer cliente para empezar a generar propuestas
              </p>
              <Button onClick={() => navigate('/clientes')}>
                <Icons.Plus /> Crear cliente
              </Button>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Quick actions */}
          <div style={{
            background: '#fff', borderRadius: 12,
            border: '1px solid #e5e7eb', overflow: 'hidden',
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f1f5' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Accesos directos</h3>
            </div>
            <div style={{ padding: 8 }}>
              {[
                { icon: Icons.Users, label: 'Clientes', desc: 'Gestionar base de clientes', path: '/clientes' },
                { icon: Icons.Columns, label: 'Pipeline', desc: 'Embudo de ventas', path: '/pipeline' },
                { icon: Icons.Package, label: 'Productos', desc: 'Catalogo de servicios', path: '/productos' },
                { icon: Icons.Activity, label: 'Metricas', desc: 'Rendimiento comercial', path: '/metricas' },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div
                    key={i}
                    onClick={() => navigate(item.path)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 12px', borderRadius: 8,
                      cursor: 'pointer', transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8f9fb'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: '#f0f1f5', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      color: '#6b7280', flexShrink: 0,
                    }}>
                      <Icon />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{item.label}</div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{item.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Needs attention */}
          {needsAttention.length > 0 && (
            <div style={{
              background: '#fff', borderRadius: 12,
              border: '1px solid #e5e7eb', overflow: 'hidden',
            }}>
              <div style={{
                padding: '16px 20px', borderBottom: '1px solid #f0f1f5',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#dc2626', animation: 'pulse 2s infinite',
                }} />
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  Necesitan atencion
                </h3>
                <span style={{
                  fontSize: '0.75rem', fontWeight: 600,
                  background: '#dc262615', color: '#dc2626',
                  padding: '2px 8px', borderRadius: 10, marginLeft: 'auto',
                }}>
                  {needsAttention.length}
                </span>
              </div>
              <div style={{ padding: 8 }}>
                {needsAttention.slice(0, 4).map(c => (
                  <div
                    key={c.id}
                    onClick={() => onOpenClient(c)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', borderRadius: 8,
                      cursor: 'pointer', fontSize: '0.8125rem',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626', flexShrink: 0 }} />
                    <span style={{ fontWeight: 500 }}>{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent activity placeholder */}
          <div style={{
            background: '#fff', borderRadius: 12,
            border: '1px solid #e5e7eb', overflow: 'hidden',
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f1f5' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Actividad reciente</h3>
            </div>
            <div style={{ padding: '24px 20px', textAlign: 'center', color: '#9ca3af' }}>
              <p style={{ fontSize: '0.8125rem' }}>Las acciones recientes apareceran aqui</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
