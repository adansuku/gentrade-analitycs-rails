import { Icons } from '../ui/Icons';
import { Button } from '@/components/ui/button';

const inputStyle = {
  padding: '8px 12px',
  border: '1.5px solid #e5e7eb',
  borderRadius: 8,
  fontSize: '0.875rem',
  outline: 'none',
  background: '#fff',
};

const selectStyle = {
  ...inputStyle,
  appearance: 'none',
  cursor: 'pointer',
};

export function PurchasesSection({
  purchases,
  purchasesLoading,
  products,
  newPurchase,
  setNewPurchase,
  onAddPurchase,
  onDeletePurchase,
}) {
  return (
    <div style={{ padding: 20 }}>
      {/* Formulario para añadir compra */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select
          value={newPurchase.productId}
          onChange={(e) => {
            const p = products.find(x => String(x.id) === e.target.value);
            setNewPurchase({ ...newPurchase, productId: e.target.value, unitPrice: p?.price != null ? String(p.price) : '' });
          }}
          style={{ ...selectStyle, flex: 1, minWidth: 120 }}
        >
          <option value="">Seleccionar producto...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} {p.price ? `(${p.price} ${p.currency || 'EUR'})` : ''}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          value={newPurchase.quantity}
          onChange={(e) => setNewPurchase({ ...newPurchase, quantity: e.target.value })}
          placeholder="Cant."
          style={{ ...inputStyle, width: 70 }}
        />
        <input
          type="number"
          step="0.01"
          value={newPurchase.unitPrice}
          onChange={(e) => setNewPurchase({ ...newPurchase, unitPrice: e.target.value })}
          placeholder="Precio"
          style={{ ...inputStyle, width: 100 }}
        />
        <Button
          onClick={onAddPurchase}
          disabled={!newPurchase.productId}
          style={{
            background: !newPurchase.productId ? '#e5e7eb' : '#1b5e3b',
            color: !newPurchase.productId ? '#9ca3af' : '#fff',
            border: 'none',
            fontWeight: 600,
            padding: '8px 14px',
            fontSize: '0.8125rem',
            borderRadius: 8,
          }}
        >
          <Icons.Plus /> Anadir
        </Button>
      </div>

      {/* Estado de carga */}
      {purchasesLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }}>
          <div style={{ height: 12, background: '#f3f4f6', borderRadius: 6, width: '100%' }} />
          <div style={{ height: 12, background: '#f3f4f6', borderRadius: 6, width: '60%' }} />
        </div>
      ) : purchases.length === 0 ? (
        /* Estado vacío */
        <div style={{ textAlign: 'center', padding: '32px 16px', color: '#9ca3af' }}>
          <div style={{ marginBottom: 8 }}>
            <Icons.ShoppingCart />
          </div>
          <p style={{ fontWeight: 600, color: '#6b7280', margin: '0 0 4px' }}>
            Sin compras registradas
          </p>
          <span style={{ fontSize: '0.8125rem' }}>
            Registra productos que este cliente ha comprado para enriquecer las propuestas
          </span>
        </div>
      ) : (
        /* Tabla de compras */
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f0f1f5' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#9ca3af', fontWeight: 500 }}>
                  Producto
                </th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#9ca3af', fontWeight: 500 }}>
                  Cant.
                </th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#9ca3af', fontWeight: 500 }}>
                  Precio
                </th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#9ca3af', fontWeight: 500 }}>
                  Fecha
                </th>
                <th style={{ padding: '8px 12px', width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f8f9fb' }}>
                  <td style={{ padding: '10px 12px', color: '#111827' }}>
                    {p.product?.name || 'N/A'}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#6b7280' }}>{p.quantity}</td>
                  <td style={{ padding: '10px 12px', color: '#6b7280' }}>
                    {p.totalPrice != null ? `${p.totalPrice} ${p.currency}` : '-'}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#6b7280' }}>
                    {new Date(p.date).toLocaleDateString('es-ES')}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <button
                      onClick={() => onDeletePurchase(p.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#d1d5db',
                        padding: 2,
                      }}
                      aria-label="Eliminar"
                    >
                      <Icons.Trash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
