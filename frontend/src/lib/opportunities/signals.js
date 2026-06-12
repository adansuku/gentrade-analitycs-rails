function fmtCurrency(n, currency = 'EUR') {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString('es-ES', { style: 'currency', currency, maximumFractionDigits: 2 });
}

function safeNumber(value) {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9,.-]/g, '').replace(',', '.');
    const n = Number.parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Build a minimal set of actionable signals from ecommerce widget data.
 * This is intentionally deterministic (no LLM) so it stays explainable.
 */
export function buildEcommerceSignals({ integrationType, integrationLabel, ecommerceData, currency = 'EUR', config } = {}) {
  const signals = [];
  const products = ecommerceData?.products || [];
  const summary = ecommerceData?.summary || {};

  const lowStockThreshold =
    safeNumber(config?.alertConfig?.lowStockThreshold ?? config?.lowStockThreshold) ??
    10;

  // STOCKOUT RISK
  const lowStock = products
    .filter((p) => typeof p.stock === 'number')
    .filter((p) => p.stock <= lowStockThreshold)
    .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));

  for (const p of lowStock.slice(0, 10)) {
    const severity = p.stock === 0 ? 'critical' : 'warning';
    const sales = safeNumber(p.sales) ?? 0;
    const title = p.stock === 0 ? 'Riesgo de rotura de stock (agotado)' : 'Riesgo de rotura de stock';
    signals.push({
      id: `stockout:${integrationType}:${p.name || p.id || Math.random()}`,
      type: 'stockout_risk',
      severity,
      title,
      subtitle: integrationLabel,
      why: `${p.name || 'Producto'} tiene ${p.stock} uds (umbral ${lowStockThreshold}).`,
      evidence: [
        { label: 'Stock', value: `${p.stock} uds` },
        sales ? { label: 'Ventas (periodo)', value: `${sales}` } : null,
      ].filter(Boolean),
      actions: [
        'Evitar escalar campañas de captación a tráfico frío para este producto.',
        'Priorizar remarketing o lista de espera si aplica.',
        'Revisar reposición (lead time) y alternativas con stock.',
      ],
    });
  }

  // OVERSTOCK (heuristic)
  const overstock = products
    .filter((p) => typeof p.stock === 'number')
    .map((p) => {
      const sales = safeNumber(p.sales) ?? 0;
      const stock = p.stock ?? 0;
      // If sales is a 30d count (common), coverageDays = stock / (sales/30).
      const coverageDays = sales > 0 ? stock / (sales / 30) : Infinity;
      return { ...p, sales, stock, coverageDays };
    })
    .filter((p) => (p.stock ?? 0) >= lowStockThreshold * 8)
    .filter((p) => p.sales === 0 || p.coverageDays >= 120)
    .sort((a, b) => (b.stock ?? 0) - (a.stock ?? 0));

  for (const p of overstock.slice(0, 10)) {
    const title = 'Posible sobrestock';
    const coverage = Number.isFinite(p.coverageDays) ? Math.round(p.coverageDays) : null;
    signals.push({
      id: `overstock:${integrationType}:${p.name || p.id || Math.random()}`,
      type: 'overstock',
      severity: 'warning',
      title,
      subtitle: integrationLabel,
      why: `${p.name || 'Producto'} tiene ${p.stock} uds${coverage ? ` (~${coverage} dias de cobertura)` : ''}.`,
      evidence: [
        { label: 'Stock', value: `${p.stock} uds` },
        { label: 'Ventas (periodo)', value: `${p.sales}` },
      ],
      actions: [
        'Crear campaña de liquidación controlando margen (bundle, descuento escalonado).',
        'Destacar en newsletter a segmentos afines (compradores previos/categoría).',
        'Revisar precio, ficha de producto y creatividades.',
      ],
    });
  }

  // TOPLINE INSIGHT (optional)
  const totalRevenue = safeNumber(summary.totalRevenue ?? summary.totalSales ?? summary.revenue);
  const orderCount = safeNumber(summary.orderCount ?? summary.orders);
  if (totalRevenue != null && orderCount != null && orderCount > 0) {
    const aov = totalRevenue / orderCount;
    signals.push({
      id: `topline:${integrationType}`,
      type: 'kpi_snapshot',
      severity: 'info',
      title: 'Snapshot e-commerce',
      subtitle: integrationLabel,
      why: 'KPIs calculados a partir de los datos disponibles de la integración.',
      evidence: [
        { label: 'Ingresos', value: fmtCurrency(totalRevenue, currency) },
        { label: 'Pedidos', value: `${Math.round(orderCount)}` },
        { label: 'Ticket medio', value: fmtCurrency(aov, currency) },
      ],
      actions: [
        'Usar estos KPIs como baseline para detectar variaciones semana a semana.',
      ],
    });
  }

  return signals;
}
