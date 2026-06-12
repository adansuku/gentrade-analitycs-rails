import { useState, useEffect } from 'react';
import { getAuthToken } from '../hooks/useAuth';

export function AdminUsersScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'USER' });
  const [inviting, setInviting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'USER' });
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Error al cargar usuarios');

      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setInviting(true);

    try {
      const token = getAuthToken();
      const res = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(inviteForm),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al invitar usuario');
      }

      setSuccess('Usuario invitado correctamente. Se ha enviado un email.');
      setInviteForm({ email: '', name: '', role: 'USER' });
      setShowInviteModal(false);
      loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;

    try {
      const token = getAuthToken();
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al eliminar usuario');
      }

      setSuccess('Usuario eliminado correctamente');
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const openEditModal = (user) => {
    setEditUser(user);
    setEditForm({ name: user.name, email: user.email, role: user.role || 'USER' });
    setError('');
    setShowEditModal(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setEditing(true);

    try {
      const token = getAuthToken();
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al actualizar usuario');
      }

      setSuccess('Usuario actualizado correctamente');
      setShowEditModal(false);
      setEditUser(null);
      loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setEditing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p>Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Gestión de Usuarios</h1>
        <button
          onClick={() => setShowInviteModal(true)}
          style={{
            background: '#1b5e3b',
            color: 'white',
            padding: '10px 20px',
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: 500,
          }}
        >
          + Invitar Usuario
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{
          background: '#fef2f2',
          color: '#dc2626',
          padding: 12,
          borderRadius: 8,
          marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          background: '#f0fdf4',
          color: '#16a34a',
          padding: 12,
          borderRadius: 8,
          marginBottom: 16,
        }}>
          {success}
        </div>
      )}

      {/* Users Table */}
      <div style={{
        background: 'white',
        borderRadius: 8,
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>
                Nombre
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>
                Email
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>
                Rol
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>
                Fecha de Creación
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>
                  No hay usuarios registrados
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px' }}>{user.name}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{user.email}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 10px',
                      borderRadius: 12,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      background: user.role === 'ADMIN' ? '#eef2ff' : '#f3f4f6',
                      color: user.role === 'ADMIN' ? '#4338ca' : '#6b7280',
                    }}>
                      {user.role === 'ADMIN' ? 'Admin' : 'Usuario'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                    {new Date(user.createdAt).toLocaleDateString('es-ES')}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => openEditModal(user)}
                      style={{
                        background: '#f3f4f6',
                        color: '#374151',
                        padding: '6px 12px',
                        borderRadius: 4,
                        border: '1px solid #e5e7eb',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        marginRight: 8,
                      }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      style={{
                        background: '#fee',
                        color: '#dc2626',
                        padding: '6px 12px',
                        borderRadius: 4,
                        border: '1px solid #fecaca',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                      }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {showEditModal && editUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 32,
            maxWidth: 500,
            width: '90%',
          }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '1.25rem', fontWeight: 600 }}>
              Editar Usuario
            </h2>

            <form onSubmit={handleEdit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.875rem', fontWeight: 500 }}>
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    fontSize: '0.95rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.875rem', fontWeight: 500 }}>
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    fontSize: '0.95rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.875rem', fontWeight: 500 }}>
                  Rol
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    fontSize: '0.95rem',
                    boxSizing: 'border-box',
                    background: 'white',
                  }}
                >
                  <option value="USER">Usuario</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditUser(null);
                    setError('');
                  }}
                  disabled={editing}
                  style={{
                    background: 'white',
                    color: '#6b7280',
                    padding: '10px 20px',
                    borderRadius: 6,
                    border: '1px solid #e5e7eb',
                    cursor: editing ? 'not-allowed' : 'pointer',
                    fontSize: '0.95rem',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  style={{
                    background: editing ? '#9ca3af' : '#1b5e3b',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: 6,
                    border: 'none',
                    cursor: editing ? 'not-allowed' : 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                  }}
                >
                  {editing ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 32,
            maxWidth: 500,
            width: '90%',
          }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '1.25rem', fontWeight: 600 }}>
              Invitar Usuario
            </h2>

            <form onSubmit={handleInvite}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.875rem', fontWeight: 500 }}>
                  Email
                </label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    fontSize: '0.95rem',
                    boxSizing: 'border-box',
                  }}
                  placeholder="usuario@ejemplo.com"
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.875rem', fontWeight: 500 }}>
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    fontSize: '0.95rem',
                    boxSizing: 'border-box',
                  }}
                  placeholder="Juan Pérez"
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.875rem', fontWeight: 500 }}>
                  Rol
                </label>
                <select
                  value={inviteForm.role || 'USER'}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    fontSize: '0.95rem',
                    boxSizing: 'border-box',
                    background: 'white',
                  }}
                >
                  <option value="USER">Usuario</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteForm({ email: '', name: '', role: 'USER' });
                    setError('');
                  }}
                  disabled={inviting}
                  style={{
                    background: 'white',
                    color: '#6b7280',
                    padding: '10px 20px',
                    borderRadius: 6,
                    border: '1px solid #e5e7eb',
                    cursor: inviting ? 'not-allowed' : 'pointer',
                    fontSize: '0.95rem',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  style={{
                    background: inviting ? '#9ca3af' : '#1b5e3b',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: 6,
                    border: 'none',
                    cursor: inviting ? 'not-allowed' : 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                  }}
                >
                  {inviting ? 'Invitando...' : 'Enviar Invitación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsersScreen;
