import tokens from './workspace/tokens';
import { Icons } from '../ui/Icons';

const integrationLabels = {
  shopify: 'Shopify',
  woocommerce: 'WooCommerce',
  meta_ads: 'Meta Ads',
  google_ads: 'Google Ads',
  google_analytics: 'Google Analytics',
  connectif: 'Connectif',
  holded: 'Holded',
  csv: 'CSV',
};

export default function MissingIntegrationsCTA({ missing, onNavigateIntegrations }) {
  if (!missing || missing.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: tokens.space[2],
        marginTop: tokens.space[4],
      }}
    >
      {missing.map((key) => (
        <button
          key={key}
          onClick={() => onNavigateIntegrations?.()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: tokens.space[2],
            padding: `${tokens.space[2]}px ${tokens.space[3]}px`,
            borderRadius: tokens.radius.sm,
            border: `1px solid ${tokens.border}`,
            background: tokens.surface,
            color: tokens.accent,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Icons.Zap style={{ width: 14, height: 14 }} />
          Conectar {integrationLabels[key] || key}
        </button>
      ))}
    </div>
  );
}
