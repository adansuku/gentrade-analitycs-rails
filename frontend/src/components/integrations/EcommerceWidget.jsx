/**
 * EcommerceWidget — E-commerce metrics display
 * Shows revenue, orders, top products, and recent orders
 */

import { Icons } from '../ui/Icons';

const cardStyle = {
  background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden',
};
const headerStyle = {
  padding: '16px 20px', borderBottom: '1px solid #f0f1f5',
  display: 'flex', alignItems: 'center', gap: 10,
};
const gridStyle = {
  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, padding: '0 20px',
};
const tableWrap = { overflowX: 'auto', padding: '0 20px 16px' };
const th = {
  fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', textAlign: 'left',
  padding: '8px 12px', borderBottom: '1px solid #f0f1f5', whiteSpace: 'nowrap',
};
const td = {
  fontSize: '0.8rem', color: '#374151', padding: '8px 12px',
  borderBottom: '1px solid #f9fafb', whiteSpace: 'nowrap',
};

function MetricCard({ label, value }) {
  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  );
}

function fmt(n) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
}

function toNumber(value) {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9,.-]/g, '').replace(',', '.');
    const n = Number.parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

const STATUS_MAP = {
  fulfilled: { label: 'Completado', bg: '#d1fae5', color: '#059669' },
  pending: { label: 'Pendiente', bg: '#fef3c7', color: '#d97706' },
  cancelled: { label: 'Cancelado', bg: '#fee2e2', color: '#dc2626' },
  refunded: { label: 'Reembolsado', bg: '#f3f4f6', color: '#6b7280' },
};

export default function EcommerceWidget({ data }) {
  if (!data) {
    return (
      <div style={{ ...cardStyle, padding: 32, textAlign: 'center', color: '#9ca3af' }}>
        <Icons.ShoppingCart />
        <p style={{ marginTop: 8 }}>Sin datos de e-commerce</p>
      </div>
    );
  }

  const { orders = [], products = [], summary = {} } = data;

  const orderCount = toNumber(summary.orderCount ?? summary.orders) ?? orders.length;

  // Backends vary: support common aliases and compute from orders when available.
  const revenueAliases = [
    summary.totalRevenue,
    summary.totalSales,
    summary.revenue,
    summary.grossSales,
    summary.total,
    summary.total_amount,
  ];
  let totalRevenue = revenueAliases.map(toNumber).find(v => v != null);

  const ordersRevenue = orders
    .map(o => toNumber(o.total ?? o.totalPrice ?? o.amount ?? o.value))
    .filter(v => v != null)
    .reduce((a, b) => a + b, 0);

  const usedOrdersFallback = (totalRevenue == null) && ordersRevenue > 0;
  if (totalRevenue == null && usedOrdersFallback) totalRevenue = ordersRevenue;

  const avgOrder =
    toNumber(summary.avgOrderValue ?? summary.averageOrderValue ?? summary.aov) ??
    (totalRevenue != null && orderCount > 0 ? totalRevenue / orderCount : null);

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#10b98112', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icons.ShoppingCart />
        </div>
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>E-commerce</div>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Ventas y productos</div>
        </div>
      </div>

      <div style={gridStyle}>
        <MetricCard label="Ingresos totales" value={totalRevenue == null ? '—' : fmt(totalRevenue)} />
        <MetricCard label="Pedidos" value={Number(orderCount || 0).toLocaleString()} />
        <MetricCard label="Productos" value={(summary.totalProducts ?? products.length).toLocaleString()} />
        <MetricCard label="Pedido medio" value={avgOrder == null ? '—' : fmt(avgOrder)} />
      </div>

      {usedOrdersFallback && (
        <div style={{ padding: '8px 20px 0', fontSize: '0.75rem', color: '#9ca3af' }}>
          Nota: ingresos calculados a partir de los pedidos disponibles en el widget.
        </div>
      )}

      {products.length > 0 && (
        <div style={tableWrap}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', marginBottom: 6, paddingLeft: 12 }}>Productos mas vendidos</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Nombre</th>
                <th style={th}>Precio</th>
                <th style={th}>Stock</th>
                <th style={th}>Ventas</th>
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 5).map((p, i) => (
                <tr key={i}>
                  <td style={td}>{p.name || '-'}</td>
                  <td style={td}>{fmt(p.price)}</td>
                  <td style={{ ...td, color: (p.stock ?? 0) <= 5 ? '#dc2626' : '#374151', fontWeight: (p.stock ?? 0) <= 5 ? 600 : 400 }}>
                    {p.stock ?? '-'}
                  </td>
                  <td style={{ ...td, fontWeight: 600 }}>{(p.sales ?? 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {orders.length > 0 && (
        <div style={tableWrap}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', marginBottom: 6, paddingLeft: 12 }}>Pedidos recientes</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>ID</th>
                <th style={th}>Estado</th>
                <th style={th}>Total</th>
                <th style={th}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 5).map((o, i) => {
                const s = STATUS_MAP[o.status] || { label: o.status || '-', bg: '#f3f4f6', color: '#6b7280' };
                return (
                  <tr key={i}>
                    <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.75rem' }}>{o.id || '-'}</td>
                    <td style={td}>
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 9999, background: s.bg, color: s.color }}>
                        {s.label}
                      </span>
                    </td>
                    <td style={{ ...td, fontWeight: 600 }}>{fmt(o.total)}</td>
                    <td style={td}>{o.date ? new Date(o.date).toLocaleDateString('es-ES') : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
