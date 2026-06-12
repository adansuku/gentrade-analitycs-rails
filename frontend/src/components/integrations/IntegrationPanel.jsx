/**
 * IntegrationPanel — integration management for a client
 * Handles OAuth flows, API-key connections, and renders data widgets
 */

import { useState, useEffect, useRef } from 'react';
import { authFetch } from '../../lib/api';
import { INTEGRATION_TYPES, INTEGRATION_CATEGORIES, INTEGRATION_AUTH, API_BASE } from '../../lib/constants';
import CategorySection from './CategorySection';
import ConnectionModal from './ConnectionModal';
import PropertySelectorModal from './PropertySelectorModal';
import CsvUploader from './CsvUploader';
// ConnectedWidgets removed — data display moved to Reports tab
import { CONNECTION_FIELDS } from './connectionConfig';

// Maps integration type → endpoint config for item selector
const RESOURCE_ENDPOINTS = {
  google_analytics: {
    url: `${API_BASE}/api/integrations/google/properties`,
    itemsKey: 'properties',
    mapItem: p => ({ id: p.propertyId, label: p.displayName }),
    title: 'Selecciona una propiedad de Analytics',
  },
  google_ads: {
    url: `${API_BASE}/api/integrations/google/ads-customers`,
    itemsKey: 'accounts',
    mapItem: a => ({ id: a.id, label: `${a.name}${a.manager ? ' (MCC)' : ''}` }),
    title: 'Selecciona una cuenta de Google Ads',
  },
  search_console: {
    url: `${API_BASE}/api/integrations/google/search-console-sites`,
    itemsKey: 'sites',
    mapItem: s => ({ id: s.siteUrl, label: s.siteUrl }),
    title: 'Selecciona un sitio de Search Console',
  },
  google_business: {
    url: `${API_BASE}/api/integrations/google/business-locations`,
    itemsKey: 'locations',
    mapItem: l => ({ id: l.name, label: l.title || l.name }),
    title: 'Selecciona una ubicación de Google Business',
  },
  meta_ads: {
    url: `${API_BASE}/api/integrations/meta/ad-accounts`,
    itemsKey: 'accounts',
    mapItem: a => ({ id: a.id, label: a.name }),
    title: 'Selecciona una cuenta publicitaria de Meta',
  },
  instagram_business: {
    url: `${API_BASE}/api/integrations/meta/ig-accounts`,
    itemsKey: 'accounts',
    mapItem: a => ({ id: a.id, label: a.name || a.username }),
    title: 'Selecciona una cuenta de Instagram Business',
  },
  tiktok_ads: {
    url: `${API_BASE}/api/integrations/tiktok/advertiser-accounts`,
    itemsKey: 'accounts',
    mapItem: a => ({ id: String(a.advertiser_id), label: a.advertiser_name }),
    title: 'Selecciona una cuenta de TikTok Ads',
  },
};

// Maps integration type → which config key to store the selected account ID
const CONFIG_KEY_MAP = {
  google_analytics: 'propertyId',
  google_ads: 'customerId',
  search_console: 'siteUrl',
  google_business: 'locationId',
  meta_ads: 'adAccountId',
  instagram_business: 'igAccountId',
  tiktok_ads: 'advertiserId',
};

export default function IntegrationPanel({ clientId }) {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(null);
  const [agencyAccounts, setAgencyAccounts] = useState([]);
  const [showCsvUploader, setShowCsvUploader] = useState(false);
  const [oauthError, setOauthError] = useState(null);
  // activeTab removed — data tab moved to Reports
  const [itemSelector, setItemSelector] = useState({ open: false, items: [], selected: '', title: '', type: null, agencyAccountId: null });
  const [connectionModal, setConnectionModal] = useState({ open: false, type: null, connecting: false, error: null });

  // Tracks which integration type is pending an OAuth popup completion
  const pendingGoogleType = useRef(null);
  const pendingMetaType = useRef(null);
  const pendingShopifyClientId = useRef(null);

  const loadIntegrations = async () => {
    try {
      const r = await authFetch(`${API_BASE}/api/integrations/client/${clientId}`);
      const data = await r.json();
      setIntegrations(data.integrations || []);
    } catch (err) {
      console.error('Error loading integrations:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const r = await authFetch(`${API_BASE}/api/integrations/accounts`);
      const data = await r.json();
      setAgencyAccounts(data.accounts || []);
    } catch (err) {
      console.error('Error loading accounts:', err);
    }
  };

  useEffect(() => {
    loadIntegrations();
    loadAccounts();
  }, [clientId]);

  // OAuth popup state — tracks the in-flight provider/label shown in the UI
  const oauthPopupRef = useRef(null);
  const oauthTimeoutRef = useRef(null);
  const [oauthPending, setOauthPending] = useState(null); // { provider, label } | null

  // Open a popup synchronously on the user click, so browsers don't block it.
  // Navigate it later once we have the real auth URL from the server.
  const openBlankPopup = (name, provider, label) => {
    const popup = window.open('about:blank', name, 'width=500,height=700');
    if (!popup) {
      setOauthError('Activa las ventanas emergentes para conectar esta integración');
      return null;
    }
    try {
      popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Conectando…</title><style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#555;background:#fafafa}.s{width:32px;height:32px;border:3px solid #eee;border-top-color:#3b82f6;border-radius:50%;animation:r 0.8s linear infinite;margin-bottom:16px}@keyframes r{to{transform:rotate(360deg)}}</style></head><body><div style="text-align:center"><div class="s"></div><p>Conectando con ${label || provider}…</p></div></body></html>`);
      popup.document.close();
    } catch { /* cross-origin already; ignore */ }
    oauthPopupRef.current = popup;
    setOauthPending({ provider, label });
    // Safety timeout: if no completion message arrives in 3 minutes, clear state
    if (oauthTimeoutRef.current) clearTimeout(oauthTimeoutRef.current);
    oauthTimeoutRef.current = setTimeout(() => {
      setOauthPending(null);
      oauthPopupRef.current = null;
    }, 3 * 60 * 1000);
    return popup;
  };

  const clearOauthPending = () => {
    if (oauthTimeoutRef.current) { clearTimeout(oauthTimeoutRef.current); oauthTimeoutRef.current = null; }
    oauthPopupRef.current = null;
    setOauthPending(null);
  };

  useEffect(() => {
    const handleOAuthEvent = (data) => {
      if (!data || !data.type) return;
      if (data.type === 'google-auth-complete') {
        const { agencyAccountId } = data;
        clearOauthPending();
        if (agencyAccountId) {
          loadAccounts().then(() => {
            openItemSelector(pendingGoogleType.current || 'google_analytics', agencyAccountId);
          });
        }
      } else if (data.type === 'meta-auth-complete') {
        clearOauthPending();
        loadAccounts();
        openItemSelector(pendingMetaType.current || 'meta_ads');
      } else if (data.type === 'tiktok-auth-complete') {
        clearOauthPending();
        loadAccounts();
        openItemSelector('tiktok_ads');
      } else if (data.type === 'shopify-auth-complete') {
        clearOauthPending();
        loadIntegrations();
      } else if (data.type === 'oauth-error') {
        clearOauthPending();
        setOauthError(data.message || 'Error de autorización');
      }
    };
    const onMessage = (event) => handleOAuthEvent(event.data);
    const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('gentrade-oauth') : null;
    if (bc) bc.onmessage = (event) => handleOAuthEvent(event.data);
    const onStorage = (event) => {
      if (event.key !== 'gentrade-oauth-last' || !event.newValue) return;
      try { handleOAuthEvent(JSON.parse(event.newValue).payload); } catch { /* ignore */ }
    };
    window.addEventListener('message', onMessage);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('storage', onStorage);
      if (bc) bc.close();
      if (oauthTimeoutRef.current) clearTimeout(oauthTimeoutRef.current);
    };
  }, []);

  // Fetch available items for the given integration type and open the selector modal
  const openItemSelector = async (type, agencyAccountId = null) => {
    const endpointConfig = RESOURCE_ENDPOINTS[type];
    if (!endpointConfig) return;
    try {
      // Add agencyAccountId to the request if provided
      const url = agencyAccountId 
        ? `${endpointConfig.url}?agencyAccountId=${encodeURIComponent(agencyAccountId)}`
        : endpointConfig.url;
      const r = await authFetch(url);
      const data = await r.json();
      if (data.error) {
        setOauthError(data.error);
      }
      const rawItems = data[endpointConfig.itemsKey] || [];
      const items = rawItems.map(endpointConfig.mapItem);
      setItemSelector({ open: true, items, selected: '', title: endpointConfig.title, type, agencyAccountId, manual: data.manual || false });
    } catch {
      setOauthError(`Error al obtener las opciones disponibles. Inténtalo de nuevo.`);
    }
  };

  // Google Analytics: start OAuth with clientId
  const handleConnectGA = async () => {
    const popup = openBlankPopup('google-auth', 'google', 'Google Analytics');
    if (!popup) return;
    try {
      const origin = window.location.origin;
      const r = await authFetch(`${API_BASE}/api/integrations/google/auth?clientId=${clientId}&type=google_analytics&origin=${encodeURIComponent(origin)}`);
      const data = await r.json();
      if (data.authUrl) {
        pendingGoogleType.current = 'google_analytics';
        popup.location.href = data.authUrl;
      } else {
        popup.close();
        clearOauthPending();
        setOauthError(data.error || 'No se pudo iniciar la conexión con Google.');
      }
    } catch {
      popup.close();
      clearOauthPending();
      setOauthError('Error al iniciar la conexión con Google. Inténtalo de nuevo.');
    }
  };

  // Google Ads / Search Console / Google Business: same OAuth, different resource selector
  const handleConnectGoogleResource = async (type) => {
    const labelMap = { google_ads: 'Google Ads', search_console: 'Search Console', google_business: 'Google Business' };
    const popup = openBlankPopup('google-auth', 'google', labelMap[type] || 'Google');
    if (!popup) return;
    try {
      const origin = window.location.origin;
      const r = await authFetch(`${API_BASE}/api/integrations/google/auth?clientId=${clientId}&type=${type}&origin=${encodeURIComponent(origin)}`);
      const data = await r.json();
      if (data.authUrl) {
        pendingGoogleType.current = type;
        popup.location.href = data.authUrl;
      } else {
        popup.close();
        clearOauthPending();
        setOauthError(data.error || 'No se pudo iniciar la conexión con Google.');
      }
    } catch {
      popup.close();
      clearOauthPending();
      setOauthError('Error al iniciar la conexión con Google. Inténtalo de nuevo.');
    }
  };

  // Meta Ads / Instagram Business
  const handleConnectMeta = async (type) => {
    const metaAccount = agencyAccounts.find(a => a.provider === 'meta');
    if (!metaAccount) {
      const popup = openBlankPopup('meta-auth', 'meta', 'Meta');
      if (!popup) return;
      try {
        const r = await authFetch(`${API_BASE}/api/integrations/meta/auth`);
        const data = await r.json();
        if (data.authUrl) {
          pendingMetaType.current = type;
          popup.location.href = data.authUrl;
        } else {
          popup.close();
          clearOauthPending();
          setOauthError(data.error || 'Meta OAuth no disponible. Verifica la configuración del servidor.');
        }
      } catch {
        popup.close();
        clearOauthPending();
        setOauthError('Error al iniciar la conexión con Meta. Inténtalo de nuevo.');
      }
      return;
    }
    await openItemSelector(type);
  };

  // TikTok Ads
  const handleConnectTikTok = async () => {
    const popup = openBlankPopup('tiktok-auth', 'tiktok', 'TikTok Ads');
    if (!popup) return;
    try {
      const r = await authFetch(`${API_BASE}/api/integrations/tiktok/auth`);
      const data = await r.json();
      if (data.authUrl) {
        popup.location.href = data.authUrl;
      } else {
        popup.close();
        clearOauthPending();
        setOauthError(data.error || 'No se pudo iniciar la conexión con TikTok.');
      }
    } catch {
      popup.close();
      clearOauthPending();
      setOauthError('Error al iniciar la conexión con TikTok. Inténtalo de nuevo.');
    }
  };

  // Shopify OAuth
  const handleConnectShopify = async (shop) => {
    if (!shop) {
      setOauthError('Ingresa el dominio de tu tienda Shopify');
      return;
    }
    const popup = openBlankPopup('shopify-auth', 'shopify', 'Shopify');
    if (!popup) return;
    try {
      pendingShopifyClientId.current = clientId;
      const r = await authFetch(`${API_BASE}/api/integrations/shopify/auth?shop=${encodeURIComponent(shop)}&clientId=${clientId}`);
      const data = await r.json();
      if (data.authUrl) {
        popup.location.href = data.authUrl;
      } else {
        popup.close();
        clearOauthPending();
        setOauthError(data.error || 'No se pudo iniciar la conexión con Shopify.');
      }
    } catch {
      popup.close();
      clearOauthPending();
      setOauthError('Error al iniciar la conexión con Shopify. Inténtalo de nuevo.');
    }
  };

  // Handle Shopify OAuth callback
  const handleShopifyCallback = async (shop, shopName, clientId, accessToken) => {
    try {
      await authFetch(`${API_BASE}/api/integrations/client/${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'shopify',
          config: { shop, shopName, accessToken },
        }),
      });
      loadIntegrations();
    } catch {
      setOauthError('Error al conectar Shopify. Inténtalo de nuevo.');
    }
  };

  const handleConnect = (type) => {
    if (type === 'csv') { setShowCsvUploader(true); return; }
    const auth = INTEGRATION_AUTH[type];
    if (auth === 'oauth_google') {
      if (type === 'google_analytics') handleConnectGA();
      else handleConnectGoogleResource(type);
    } else if (auth === 'oauth_meta') {
      handleConnectMeta(type);
    } else if (auth === 'oauth_tiktok') {
      handleConnectTikTok();
    } else if (auth === 'oauth_shopify') {
      // For Shopify, we need to get the shop domain from user input first
      // Use the connection modal but trigger OAuth flow
      setConnectionModal({ open: true, type, connecting: false, error: null });
    } else if (CONNECTION_FIELDS[type]) {
      setConnectionModal({ open: true, type, connecting: false, error: null });
    }
  };

  // Confirm item selection: create the integration with the selected account
  const handleSelectItem = async () => {
    if (!itemSelector.selected) return;
    const type = itemSelector.type;

    // Use the agencyAccountId from the itemSelector (newly created via OAuth or selected)
    const agencyAccountId = itemSelector.agencyAccountId;

    // For backwards compatibility, fall back to finding existing account if no agencyAccountId
    let finalAgencyAccountId = agencyAccountId;
    if (!finalAgencyAccountId) {
      const googleAccount = agencyAccounts.find(a => a.provider === 'google');
      const metaAccount = agencyAccounts.find(a => a.provider === 'meta');
      const tiktokAccount = agencyAccounts.find(a => a.provider === 'tiktok');
      const googleTypes = ['google_analytics', 'google_ads', 'search_console', 'google_business'];
      const metaTypes = ['meta_ads', 'instagram_business'];
      finalAgencyAccountId = googleTypes.includes(type)
        ? googleAccount?.id
        : metaTypes.includes(type)
          ? metaAccount?.id
          : type === 'tiktok_ads'
            ? tiktokAccount?.id
            : null;
    }

    const configKey = CONFIG_KEY_MAP[type] || 'accountId';
    
    // Find the property name from selected item for display purposes
    const selectedItem = itemSelector.items.find(i => i.id === itemSelector.selected);
    const propertyName = selectedItem?.label;

    try {
      // If we're changing an existing integration (has integrationId), use PATCH instead of POST
      if (itemSelector.integrationId) {
        await authFetch(`${API_BASE}/api/integrations/client/${clientId}/${itemSelector.integrationId}/property`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            [configKey]: itemSelector.selected,
            propertyName: propertyName,
          }),
        });
      } else {
        await authFetch(`${API_BASE}/api/integrations/client/${clientId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            agencyAccountId: finalAgencyAccountId,
            config: { [configKey]: itemSelector.selected, propertyName },
          }),
        });
      }
      setItemSelector({ open: false, items: [], selected: '', title: '', type: null, agencyAccountId: null, integrationId: null });
      loadIntegrations();
    } catch {
      setOauthError('Error al conectar la integración. Inténtalo de nuevo.');
    }
  };

  const handleModalConnect = async (formValues) => {
    const auth = INTEGRATION_AUTH[connectionModal.type];
    
    // Special handling for Shopify OAuth
    if (auth === 'oauth_shopify' && formValues.shop) {
      setConnectionModal(prev => ({ ...prev, connecting: true, error: null }));
      await handleConnectShopify(formValues.shop);
      setConnectionModal(prev => ({ ...prev, connecting: false, open: false, type: null }));
      return;
    }
    
    setConnectionModal(prev => ({ ...prev, connecting: true, error: null }));
    try {
      await authFetch(`${API_BASE}/api/integrations/client/${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: connectionModal.type, config: formValues }),
      });
      setConnectionModal({ open: false, type: null, connecting: false, error: null });
      loadIntegrations();
    } catch (err) {
      setConnectionModal(prev => ({ ...prev, connecting: false, error: err.message || 'Error al conectar' }));
    }
  };

  // Open property/resource selector for an already-connected integration (change property without new OAuth)
  const handleChangeProperty = async (type) => {
    const endpointConfig = RESOURCE_ENDPOINTS[type];
    if (!endpointConfig) return;
    
    // Find the existing integration to get its agencyAccountId
    const existingIntegration = integrations.find(i => i.type === type);
    const agencyAccountId = existingIntegration?.agencyAccountId;
    
    try {
      const url = agencyAccountId
        ? `${endpointConfig.url}?agencyAccountId=${encodeURIComponent(agencyAccountId)}`
        : endpointConfig.url;
      const r = await authFetch(url);
      const data = await r.json();
      const rawItems = data[endpointConfig.itemsKey] || [];
      const items = rawItems.map(endpointConfig.mapItem);
      setItemSelector({ 
        open: true, 
        items, 
        selected: '', 
        title: endpointConfig.title, 
        type, 
        agencyAccountId,
        integrationId: existingIntegration?.id, // Track which integration we're changing
      });
    } catch {
      setOauthError('Error al obtener las opciones disponibles. Inténtalo de nuevo.');
    }
  };

  const handleDisconnect = async (integrationId) => {
    if (!confirm('Seguro que quieres desconectar esta integracion?')) return;
    try {
      await authFetch(`${API_BASE}/api/integrations/client/${clientId}/${integrationId}`, { method: 'DELETE' });
      loadIntegrations();
    } catch {
      console.error('Error disconnecting');
    }
  };

  const handleReconnect = async (type, integrationId) => {
    try {
      // First delete the existing integration with expired/invalid credentials
      await authFetch(`${API_BASE}/api/integrations/client/${clientId}/${integrationId}`, { method: 'DELETE' });
      // Then start fresh OAuth flow
      handleConnect(type);
    } catch (err) {
      console.error('Error reconnecting:', err);
      setOauthError('Error al reconectar. Inténtalo de nuevo.');
    }
  };

  const handleSync = async (integrationId) => {
    setSyncing(integrationId);
    try {
      await authFetch(`${API_BASE}/api/integrations/client/${clientId}/${integrationId}/sync`, { method: 'POST' });
      loadIntegrations();
    } catch {
      console.error('Error syncing');
    } finally {
      setSyncing(null);
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-sm text-gray-400">Cargando integraciones...</div>;
  }

  const modalType = connectionModal.type;
  const connectedCount = integrations.filter(i => i.status === 'connected').length;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      {connectedCount > 0 && (
        <div style={{ fontSize: 13, color: '#6b7280' }}>
          {connectedCount} integración{connectedCount !== 1 ? 'es' : ''} conectada{connectedCount !== 1 ? 's' : ''}. Los datos se muestran en la pestaña <strong>Reportes</strong>.
        </div>
      )}

      {/* OAuth pending banner — shown while the popup is open */}
      {oauthPending && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm">
          <span className="inline-block w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
          <span>Conectando con {oauthPending.label}… completa la autorización en la ventana emergente.</span>
          <button onClick={() => { try { oauthPopupRef.current?.close(); } catch { /* ignore */ } clearOauthPending(); }} className="ml-auto font-semibold text-blue-600 hover:text-blue-800 px-1.5 py-0.5 rounded">
            Cancelar
          </button>
        </div>
      )}

      {/* OAuth error banner */}
      {oauthError && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
          <span>{oauthError}</span>
          <button onClick={() => setOauthError(null)} className="font-semibold text-red-600 hover:text-red-800 px-1.5 py-0.5 rounded">
            Cerrar
          </button>
        </div>
      )}

      {/* Integration management */}
      <div className="flex flex-col gap-0">
        {Object.entries(INTEGRATION_CATEGORIES).map(([catKey, cat]) => (
          <CategorySection
            key={catKey}
            categoryKey={catKey}
            categoryLabel={cat.label}
            integrations={integrations}
            syncing={syncing}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onSync={handleSync}
            onReconnect={handleReconnect}
            onChangeProperty={handleChangeProperty}
          />
        ))}
      </div>

      {showCsvUploader && (
        <CsvUploader
          clientId={clientId}
          onComplete={() => { setShowCsvUploader(false); loadIntegrations(); }}
        />
      )}

      {itemSelector.open && (
        <PropertySelectorModal
          items={itemSelector.items}
          selectedItem={itemSelector.selected}
          onSelect={sel => setItemSelector(prev => ({ ...prev, selected: sel }))}
          onConfirm={handleSelectItem}
          onClose={() => setItemSelector({ open: false, items: [], selected: '', title: '', type: null })}
          title={itemSelector.title}
          searchable={itemSelector.type === 'google_analytics'}
          searchPlaceholder="Buscar propiedad…"
          allowManual={itemSelector.manual || itemSelector.type === 'google_ads'}
          manualPlaceholder="123-456-7890"
        />
      )}

      <ConnectionModal
        isOpen={connectionModal.open}
        onClose={() => setConnectionModal({ open: false, type: null, connecting: false, error: null })}
        onConnect={handleModalConnect}
        typeName={modalType ? (INTEGRATION_TYPES[modalType]?.label || modalType) : ''}
        typeColor={modalType ? (INTEGRATION_TYPES[modalType]?.color || '#1b5e3b') : '#1b5e3b'}
        fields={modalType ? (CONNECTION_FIELDS[modalType] || []) : []}
        connecting={connectionModal.connecting}
        error={connectionModal.error}
      />
    </div>
  );
}
