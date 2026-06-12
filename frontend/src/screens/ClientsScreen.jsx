import { useState, useEffect } from 'react';
import { Icons } from '../components/ui/Icons';
import { API_BASE } from '../lib/constants.js';
import { authFetch } from '../lib/api.js';
import { Button } from '@/components/ui/button';

export function ClientsScreen({ onOpenClient, initialEditClient, onEditCleared, mode }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', company: '', industry: '', notes: ''
  });

  const fetchClients = async () => {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await authFetch(`${API_BASE}/api/clients${params}`);
      const data = await response.json();
      setClients(data.clients || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, [search]);

  const handleNewClient = () => {
    setEditingClient(null);
    setFormData({ name: '', email: '', phone: '', company: '', industry: '', notes: '' });
    setShowModal(true);
  };

  const openEditModal = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name || '', email: client.email || '', phone: client.phone || '',
      company: client.company || '', industry: client.industry || '', notes: client.notes || ''
    });
    setShowModal(true);
  };

  useEffect(() => {
    if (initialEditClient) {
      openEditModal(initialEditClient);
      if (onEditCleared) onEditCleared();
    }
  }, [initialEditClient]);

  const handleSaveClient = async () => {
    if (!formData.name.trim()) return;
    try {
      const url = editingClient ? `${API_BASE}/api/clients/${editingClient.id}` : `${API_BASE}/api/clients`;
      const method = editingClient ? 'PUT' : 'POST';
      const response = await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      if (response.ok) { setShowModal(false); fetchClients(); }
    } catch (error) { console.error('Error saving client:', error); }
  };

  const handleDeleteClient = async (clientId) => {
    if (!confirm('Seguro que quieres borrar este cliente?')) return;
    try {
      const response = await authFetch(`${API_BASE}/api/clients/${clientId}`, { method: 'DELETE' });
      if (response.ok) fetchClients();
    } catch (error) { console.error('Error deleting client:', error); }
  };

  const avatarColor = (name) => {
    const hue = (name?.charCodeAt(0) || 0) * 37 % 360;
    return { bg: `hsl(${hue}, 55%, 92%)`, fg: `hsl(${hue}, 55%, 40%)` };
  };

  // Shared styles
  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid #e5e7eb', fontSize: '0.875rem',
    background: '#f8f9fb', color: '#111827', outline: 'none',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1b5e3b 0%, #0f4a2a 50%, #0a2f1c 100%)',
        padding: '40px 32px 48px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -40, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -80, left: '30%', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 8 }}>
            Gestion de clientes
          </div>
          <h1 style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 8, lineHeight: 1.2 }}>
            Clientes
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9375rem', marginBottom: 28, maxWidth: 480 }}>
            {clients.length} cliente{clients.length !== 1 ? 's' : ''} en tu cartera comercial.
          </p>
          <Button
            onClick={handleNewClient}
            style={{ background: '#fff', color: '#1b5e3b', border: 'none', fontWeight: 600 }}
          >
            <Icons.Plus /> Nuevo cliente
          </Button>
        </div>
      </div>

      {/* Search bar — overlapping */}
      <div style={{ maxWidth: 1100, margin: '-24px auto 0', padding: '0 32px', position: 'relative', zIndex: 2 }}>
        <div style={{
          background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px',
        }}>
          <Icons.Search />
          <input
            type="text"
            placeholder="Buscar por nombre, empresa o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1, padding: '16px 0', border: 'none', outline: 'none',
              fontSize: '0.9375rem', background: 'transparent', color: '#111827',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}>
              <Icons.X />
            </button>
          )}
        </div>
      </div>

      {/* Proposal mode banner */}
      {mode === 'proposal' && (
        <div style={{
          maxWidth: 1100, margin: '16px auto 0', padding: '0 32px',
        }}>
          <div style={{
            background: '#1b5e3b08', border: '1px solid #1b5e3b20',
            borderRadius: 10, padding: '14px 20px',
            display: 'flex', alignItems: 'center', gap: 12,
            color: '#1b5e3b', fontSize: '0.875rem', fontWeight: 500,
          }}>
            <Icons.Sparkles />
            Selecciona un cliente para iniciar una nueva propuesta
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 32px 48px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
            Cargando clientes...
          </div>
        ) : clients.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
            padding: '60px 24px', textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, background: '#f0f1f5',
              margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af',
            }}>
              <Icons.Users />
            </div>
            <p style={{ fontSize: '1rem', fontWeight: 500, color: '#374151', marginBottom: 6 }}>Sin clientes todavia</p>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: 20 }}>Crea tu primer cliente para empezar a generar propuestas</p>
            <Button onClick={handleNewClient}><Icons.Plus /> Crear cliente</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#e5e7eb', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
            {clients.map((client) => {
              const colors = avatarColor(client.name);
              return (
                <div
                  key={client.id}
                  onClick={() => onOpenClient(client)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '16px 24px', background: '#fff',
                    cursor: 'pointer', transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8f9fb'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: colors.bg, color: colors.fg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.875rem', fontWeight: 700, flexShrink: 0,
                  }}>
                    {client.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#111827', marginBottom: 2 }}>
                      {client.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '0.8125rem', color: '#6b7280' }}>
                      {client.company && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Icons.Building /> {client.company}
                        </span>
                      )}
                      {client.email && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Icons.Mail /> {client.email}
                        </span>
                      )}
                      {client.phone && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Icons.Phone /> {client.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Meta */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 500, color: '#6b7280',
                      background: '#f0f1f5', padding: '4px 10px', borderRadius: 6,
                    }}>
                      {client.proposalCount || 0} propuestas
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditModal(client); }}
                        title="Editar"
                        style={{
                          width: 32, height: 32, borderRadius: 8, border: 'none',
                          background: 'transparent', color: '#9ca3af', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.12s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#f0f1f5'; e.currentTarget.style.color = '#374151'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
                      >
                        <Icons.Edit />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }}
                        title="Eliminar"
                        style={{
                          width: 32, height: 32, borderRadius: 8, border: 'none',
                          background: 'transparent', color: '#9ca3af', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.12s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
                      >
                        <Icons.Trash />
                      </button>
                    </div>
                    <Icons.ArrowRight />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520,
              boxShadow: '0 24px 48px rgba(0,0,0,0.15)', overflow: 'hidden',
              animation: 'slideUp 0.2s ease-out',
            }}
          >
            {/* Modal header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid #f0f1f5',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                {editingClient ? 'Editar cliente' : 'Nuevo cliente'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: 'none',
                  background: '#f0f1f5', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: '#6b7280',
                }}
              >
                <Icons.X />
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 6, color: '#374151' }}>Nombre *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nombre del cliente" autoFocus style={inputStyle} onFocus={e => e.target.style.borderColor = '#1b5e3b'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 6, color: '#374151' }}>Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@ejemplo.com" style={inputStyle} onFocus={e => e.target.style.borderColor = '#1b5e3b'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 6, color: '#374151' }}>Telefono</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+34 600 000 000" style={inputStyle} onFocus={e => e.target.style.borderColor = '#1b5e3b'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 6, color: '#374151' }}>Empresa</label>
                  <input type="text" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} placeholder="Nombre de empresa" style={inputStyle} onFocus={e => e.target.style.borderColor = '#1b5e3b'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 6, color: '#374151' }}>Sector</label>
                  <input type="text" value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} placeholder="Ej. tecnologia" style={inputStyle} onFocus={e => e.target.style.borderColor = '#1b5e3b'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 6, color: '#374151' }}>Notas</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Notas adicionales..." rows={3} style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} onFocus={e => e.target.style.borderColor = '#1b5e3b'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
              </div>
            </div>

            {/* Modal footer */}
            <div style={{
              padding: '16px 24px', borderTop: '1px solid #f0f1f5',
              display: 'flex', justifyContent: 'flex-end', gap: 10,
            }}>
              <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button onClick={handleSaveClient} disabled={!formData.name.trim()}>
                <Icons.Check />
                {editingClient ? 'Guardar cambios' : 'Crear cliente'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientsScreen;
