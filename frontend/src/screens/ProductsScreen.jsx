import { useState, useEffect } from 'react';
import { Icons } from '../components/ui/Icons';
import { API_BASE } from '../lib/constants.js';
import { authFetch } from '../lib/api.js';
import { Button } from '@/components/ui/button';

export function ProductsScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '', description: '', category: '', price: '', currency: 'EUR', isActive: true,
  });

  const fetchProducts = async () => {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const r = await authFetch(`${API_BASE}/api/products${params}`);
      const data = await r.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, [search]);

  const handleNewProduct = () => {
    setEditingProduct(null);
    setFormData({ name: '', description: '', category: '', price: '', currency: 'EUR', isActive: true });
    setShowModal(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      category: product.category || '',
      price: product.price != null ? String(product.price) : '',
      currency: product.currency || 'EUR',
      isActive: product.isActive !== false,
    });
    setShowModal(true);
  };

  const handleSaveProduct = async () => {
    if (!formData.name.trim()) return;
    try {
      const url = editingProduct
        ? `${API_BASE}/api/products/${editingProduct.id}`
        : `${API_BASE}/api/products`;
      const method = editingProduct ? 'PUT' : 'POST';
      const body = {
        ...formData,
        price: formData.price ? parseFloat(formData.price) : null,
      };
      const r = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        setShowModal(false);
        fetchProducts();
      }
    } catch (err) {
      console.error('Error saving product:', err);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!confirm('Seguro que quieres borrar este producto?')) return;
    try {
      const r = await authFetch(`${API_BASE}/api/products/${productId}`, { method: 'DELETE' });
      if (r.ok) fetchProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  };

  const avatarColor = (name) => {
    const hue = (name?.charCodeAt(0) || 0) * 37 % 360;
    return { bg: `hsl(${hue}, 55%, 92%)`, fg: `hsl(${hue}, 55%, 40%)` };
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid #e5e7eb', fontSize: '0.875rem',
    background: '#f8f9fb', color: '#111827', outline: 'none',
    transition: 'border-color 0.15s',
  };

  const selectStyle = {
    ...inputStyle,
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: 32,
  };

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
            Catalogo
          </div>
          <h1 style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 8, lineHeight: 1.2 }}>
            Productos
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9375rem', marginBottom: 28, maxWidth: 480 }}>
            {products.length} producto{products.length !== 1 ? 's' : ''} en tu catalogo de servicios.
          </p>
          <Button
            onClick={handleNewProduct}
            style={{ background: '#fff', color: '#1b5e3b', border: 'none', fontWeight: 600 }}
          >
            <Icons.Plus /> Nuevo producto
          </Button>
        </div>
      </div>

      {/* Overlapping search bar */}
      <div style={{ maxWidth: 1100, margin: '-24px auto 0', padding: '0 32px', position: 'relative', zIndex: 2 }}>
        <div style={{
          background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px',
        }}>
          <Icons.Search />
          <input
            type="text"
            placeholder="Buscar productos por nombre o categoria..."
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

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 32px 48px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
            Cargando productos...
          </div>
        ) : products.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
            padding: '60px 24px', textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, background: '#f0f1f5',
              margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af',
            }}>
              <Icons.Package />
            </div>
            <p style={{ fontSize: '1rem', fontWeight: 500, color: '#374151', marginBottom: 6 }}>Aun no hay productos</p>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: 20 }}>Crea tu primer producto para empezar</p>
            <Button onClick={handleNewProduct}><Icons.Plus /> Crear producto</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#e5e7eb', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
            {products.map((product) => {
              const colors = avatarColor(product.name);
              return (
                <div
                  key={product.id}
                  onClick={() => handleEditProduct(product)}
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
                    background: product.isActive ? colors.bg : '#f0f1f5',
                    color: product.isActive ? colors.fg : '#9ca3af',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.875rem', fontWeight: 700, flexShrink: 0,
                  }}>
                    {product.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#111827', marginBottom: 2 }}>
                      {product.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '0.8125rem', color: '#6b7280' }}>
                      {product.category && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Icons.List /> {product.category}
                        </span>
                      )}
                      {product.price != null && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {product.price} {product.currency}
                        </span>
                      )}
                      {!product.isActive && (
                        <span style={{
                          fontSize: '0.6875rem', fontWeight: 500, color: '#9ca3af',
                          background: '#f0f1f5', padding: '2px 8px', borderRadius: 4,
                        }}>
                          Inactivo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Meta + actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 500, color: '#6b7280',
                      background: '#f0f1f5', padding: '4px 10px', borderRadius: 6,
                    }}>
                      {product.purchaseCount || 0} compras
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditProduct(product); }}
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
                        onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id); }}
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
                {editingProduct ? 'Editar producto' : 'Nuevo producto'}
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
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nombre del producto"
                  autoFocus
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#1b5e3b'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 6, color: '#374151' }}>Descripcion</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripcion del producto..."
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
                  onFocus={e => e.target.style.borderColor = '#1b5e3b'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 6, color: '#374151' }}>Categoria</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Ej. software"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#1b5e3b'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 6, color: '#374151' }}>Precio</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#1b5e3b'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 6, color: '#374151' }}>Moneda</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    style={selectStyle}
                    onFocus={e => e.target.style.borderColor = '#1b5e3b'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 6, color: '#374151' }}>Activo</label>
                  <select
                    value={formData.isActive ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                    style={selectStyle}
                    onFocus={e => e.target.style.borderColor = '#1b5e3b'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  >
                    <option value="true">Si</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div style={{
              padding: '16px 24px', borderTop: '1px solid #f0f1f5',
              display: 'flex', justifyContent: 'flex-end', gap: 10,
            }}>
              <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button onClick={handleSaveProduct} disabled={!formData.name.trim()}>
                <Icons.Check />
                {editingProduct ? 'Guardar cambios' : 'Crear producto'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductsScreen;
