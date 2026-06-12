/**
 * ConnectedWidgets — renders data widgets for all connected integrations
 * Each integration gets its own CollapsibleWidget identified by name + connected resource.
 */

import { useState, useEffect } from 'react';
import AnalyticsWidget from './AnalyticsWidget';
import AdsWidget from './AdsWidget';
import SeoWidget from './SeoWidget';
import PaymentsWidget from './PaymentsWidget';
import EmailWidget from './EmailWidget';
import CrmWidget from './CrmWidget';
import SocialWidget from './SocialWidget';
import EcommerceWidget from './EcommerceWidget';
import ShopifyAlertsWidget from './ShopifyAlertsWidget';
import CollapsibleWidget from './CollapsibleWidget';
import { authFetch } from '../../lib/api';
import { API_BASE, INTEGRATION_TYPES } from '../../lib/constants';

export function resolveWidgetGroup(type) {
  if (type === 'google_analytics') return 'analytics';
  if (['google_ads', 'meta_ads', 'tiktok_ads'].includes(type)) return 'ads';
  if (type === 'search_console') return 'seo';
  if (['stripe', 'paypal'].includes(type)) return 'payments';
  if (['mailchimp', 'klaviyo'].includes(type)) return 'email';
  if (['hubspot', 'pipedrive'].includes(type)) return 'crm';
  if (['instagram_business', 'google_business'].includes(type)) return 'social';
  if (['shopify', 'woocommerce', 'amazon_seller', 'prestashop'].includes(type)) return 'ecommerce';
  return null;
}

export function buildWidgetGroups(integrations) {
  const groups = {};
  const seenIds = new Set();
  integrations.filter(i => i.status === 'connected').forEach(i => {
    if (seenIds.has(i.id)) return;
    seenIds.add(i.id);
    const group = resolveWidgetGroup(i.type);
    if (group) {
      if (!groups[group]) groups[group] = [];
      groups[group].push(i);
    }
  });
  return groups;
}

// Returns a human-readable subtitle for the connected resource
function getIntegrationSubtitle(integration) {
  const { config } = integration;
  if (!config) return null;
  if (config.propertyName) return config.propertyName;
  if (config.shop) return config.shop;
  if (config.storeName) return config.storeName;
  if (config.propertyId) return config.propertyId;
  if (config.customerId) return config.customerId;
  if (config.adAccountId) return config.adAccountId;
  if (config.siteUrl) return config.siteUrl;
  if (config.locationId) return config.locationId;
  return null;
}

function GroupDataLoader({ clientId, integrationId, children }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!integrationId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    authFetch(`${API_BASE}/api/integrations/client/${clientId}/${integrationId}/data`)
      .then(res => res.json())
      .then(json => {
        if (cancelled) return;
        const merged = {};
        const periods = {};
        (json.data || []).forEach(({ category, period, data: categoryData }) => {
          if (!merged[category] || period > periods[category]) {
            merged[category] = categoryData;
            periods[category] = period;
          }
        });
        setData(merged);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [clientId, integrationId]);

  if (loading) return <p className="text-xs text-gray-400 py-1">Cargando datos...</p>;
  if (error) return null;

  return children(data);
}

// Maps widget group → render function for a single integration
const WIDGET_RENDERERS = {
  analytics: (integration, clientId) => (
    <AnalyticsWidget clientId={clientId} integrationId={integration.id} />
  ),
  ads: (integration, clientId) => (
    <GroupDataLoader clientId={clientId} integrationId={integration.id}>
      {(data) => <AdsWidget data={data} />}
    </GroupDataLoader>
  ),
  seo: (integration, clientId) => (
    <GroupDataLoader clientId={clientId} integrationId={integration.id}>
      {(data) => <SeoWidget data={data} />}
    </GroupDataLoader>
  ),
  payments: (integration, clientId) => (
    <GroupDataLoader clientId={clientId} integrationId={integration.id}>
      {(data) => <PaymentsWidget data={data} />}
    </GroupDataLoader>
  ),
  email: (integration, clientId) => (
    <GroupDataLoader clientId={clientId} integrationId={integration.id}>
      {(data) => <EmailWidget data={data} />}
    </GroupDataLoader>
  ),
  crm: (integration, clientId) => (
    <GroupDataLoader clientId={clientId} integrationId={integration.id}>
      {(data) => <CrmWidget data={data} />}
    </GroupDataLoader>
  ),
  social: (integration, clientId) => (
    <GroupDataLoader clientId={clientId} integrationId={integration.id}>
      {(data) => <SocialWidget data={data} />}
    </GroupDataLoader>
  ),
  ecommerce: (integration, clientId) => (
    <GroupDataLoader clientId={clientId} integrationId={integration.id}>
      {(data) => <EcommerceWidget data={data} />}
    </GroupDataLoader>
  ),
};

// Render order for widget groups
const GROUP_ORDER = ['analytics', 'ads', 'seo', 'payments', 'email', 'crm', 'social', 'ecommerce'];

export default function ConnectedWidgets({ widgetGroups, clientId }) {
  const hasWidgets = Object.keys(widgetGroups).length > 0;

  if (!hasWidgets) {
    return (
      <div className="py-12 text-center text-gray-400 text-sm">
        No hay integraciones conectadas. Ve a <span className="font-medium text-gray-600">Gestionar</span> para conectar tus herramientas.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {GROUP_ORDER.flatMap(group => {
        const integrations = widgetGroups[group];
        if (!integrations?.length) return [];

        const renderer = WIDGET_RENDERERS[group];
        const widgets = integrations.map(integration => {
          const label = INTEGRATION_TYPES[integration.type]?.label || integration.type;
          const subtitle = getIntegrationSubtitle(integration);
          return (
            <CollapsibleWidget key={integration.id} title={label} subtitle={subtitle}>
              {renderer(integration, clientId)}
            </CollapsibleWidget>
          );
        });

        // Shopify: append alerts widget after the main ecommerce widget
        if (group === 'ecommerce') {
          integrations
            .filter(i => i.type === 'shopify')
            .forEach(i => {
              const shop = i.config?.shop || i.config?.shopName;
              widgets.push(
                <CollapsibleWidget
                  key={`alerts-${i.id}`}
                  title="Alertas de Stock"
                  subtitle={shop}
                  defaultOpen={false}
                >
                  <ShopifyAlertsWidget clientId={clientId} integrationId={i.id} alertConfig={i.config?.alertConfig} />
                </CollapsibleWidget>
              );
            });
        }

        return widgets;
      })}
    </div>
  );
}
