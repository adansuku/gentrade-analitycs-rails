import ShopifyAlertsWidget from '../integrations/ShopifyAlertsWidget';
import { Icons } from '../ui/Icons';

export default function AlertsSection({ clientId, connectedIntegrations = [] }) {
  const shopify = connectedIntegrations.find((i) => i.type === 'shopify');

  if (!shopify) {
    return (
      <div style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
      }}>
        <div style={{ padding: 20, borderBottom: '1px solid #f0f1f5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: '#eef2ff', color: '#1b5e3b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icons.AlertTriangle />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#111827' }}>Alertas</div>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                Conecta Shopify en Integraciones para activar alertas de stock y demanda.
              </div>
            </div>
          </div>
        </div>
        <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>
          Sin fuentes de e-commerce conectadas.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <ShopifyAlertsWidget
        clientId={clientId}
        integrationId={shopify.id}
        alertConfig={shopify.config?.alertConfig}
        integrationLabel={shopify.resource || shopify.label}
      />
    </div>
  );
}
