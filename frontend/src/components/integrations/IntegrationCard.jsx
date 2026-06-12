/**
 * IntegrationCard — individual service card
 * Props: type, status, lastSync, config, lastError, syncing,
 *        onConnect, onDisconnect, onSync, onReconnect, onChangeProperty
 */

import { Icons } from '../ui/Icons';
import { Button } from '@/components/ui/button';
import { INTEGRATION_TYPES } from '../../lib/constants';

// Map icon name strings from INTEGRATION_TYPES to actual Icon components
const ICON_MAP = {
  BarChart3: Icons.BarChart,
  Megaphone: Icons.Zap,        // fallback: Zap (lightning bolt ~ broadcast)
  Mail: Icons.Mail,
  Users: Icons.Users,
  CreditCard: Icons.DollarSign, // fallback: DollarSign
  ShoppingBag: Icons.ShoppingCart,
  Heart: Icons.Heart,
  MapPin: Icons.Search,         // fallback: Search (location/place lookup)
  Search: Icons.Search,
  Gauge: Icons.Activity,        // fallback: Activity (performance line)
  FileUp: Icons.Upload,
  FileSpreadsheet: Icons.FileText,
};

// Build SERVICE_CONFIG from INTEGRATION_TYPES constant
const SERVICE_CONFIG = Object.fromEntries(
  Object.entries(INTEGRATION_TYPES).map(([key, v]) => [
    key,
    {
      name: v.label,
      description: v.description,
      color: v.color,
      Icon: ICON_MAP[v.icon] || Icons.Activity,
    },
  ])
);

// Which config key holds the "selected resource" for each integration type
const CONFIG_DISPLAY_KEYS = {
  google_analytics: ['propertyName', 'propertyId'],
  google_ads: ['customerId'],
  search_console: ['siteUrl'],
  google_business: ['locationId'],
  meta_ads: ['adAccountId'],
  instagram_business: ['igAccountId'],
  tiktok_ads: ['advertiserId'],
};

// Integration types that support "change property" without a new OAuth flow
const SUPPORTS_CHANGE_PROPERTY = new Set([
  'google_analytics',
  'google_ads',
  'search_console',
  'google_business',
  'meta_ads',
  'instagram_business',
  'tiktok_ads',
]);

const STATUS_STYLES = {
  connected: { label: 'Conectado', color: '#059669', bg: '#05966910', border: '#bbf7d0' },
  disconnected: { label: 'Desconectado', color: '#6b7280', bg: '#6b728010', border: '#e5e7eb' },
  error: { label: 'Error', color: '#dc2626', bg: '#dc262610', border: '#fecaca' },
};

function formatLastSync(date) {
  if (!date) return null;
  const d = new Date(date);
  const diffMs = Date.now() - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 2) return 'ahora mismo';
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays === 1) return 'ayer';
  if (diffDays < 7) return `hace ${diffDays} días`;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getConnectedResource(type, config) {
  if (!config || typeof config !== 'object') return null;
  const keys = CONFIG_DISPLAY_KEYS[type];
  if (!keys) return null;
  for (const k of keys) {
    if (config[k]) return String(config[k]);
  }
  return null;
}

export default function IntegrationCard({
  type,
  status = 'disconnected',
  lastSync,
  config,
  lastError,
  syncing,
  onConnect,
  onDisconnect,
  onSync,
  onReconnect,
  onChangeProperty,
}) {
  const serviceConfig = SERVICE_CONFIG[type] || SERVICE_CONFIG.csv;
  const statusInfo = STATUS_STYLES[status] || STATUS_STYLES.disconnected;
  const { Icon, color, name, description } = serviceConfig;
  const isConnected = status === 'connected';
  const isError = status === 'error';
  const connectedResource = getConnectedResource(type, config);
  const canChangeProperty = SUPPORTS_CHANGE_PROPERTY.has(type) && (isConnected || isError);

  const accentColor = isConnected ? '#10b981' : isError ? '#ef4444' : 'transparent';

  return (
    <div
      className="flex flex-col transition-colors"
      style={{
        backgroundColor: isConnected ? '#ffffff' : '#fafafa',
        border: '1px solid #eef2f7',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* Main row */}
      <div
        className="flex flex-col sm:flex-row sm:items-center gap-3 py-3.5"
        style={{ borderLeft: `3px solid ${accentColor}`, paddingLeft: '17px', paddingRight: '20px' }}
      >
        {/* Icon + Info */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: color + '15', color }}
          >
            <Icon size={18} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 min-w-0">
              <span className="text-sm font-semibold text-gray-900 truncate">{name}</span>
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full border shrink-0"
                style={{ color: statusInfo.color, background: statusInfo.bg, borderColor: statusInfo.border }}
              >
                {statusInfo.label}
              </span>
            </div>

            <div className="text-xs text-gray-500 leading-snug">
              {connectedResource ? (
                <>
                  <span className="text-gray-700 font-medium break-words" title={connectedResource}>{connectedResource}</span>
                  <span className="text-gray-400"> · {description}</span>
                </>
              ) : (
                description
              )}
            </div>

            {isConnected && lastSync && (
              <div className="text-[11px] text-gray-400 mt-0.5">
                Último sync: {formatLastSync(lastSync)}
              </div>
            )}
            {isError && lastSync && (
              <div className="text-[11px] text-gray-400 mt-0.5">
                Último sync exitoso: {formatLastSync(lastSync)}
              </div>
            )}
          </div>
        </div>

        {/* Actions (wrap on small screens) */}
        <div className="flex flex-wrap gap-2 items-center justify-end sm:ml-auto">
          {isConnected && canChangeProperty && onChangeProperty && (
            <Button variant="ghost" size="sm" onClick={onChangeProperty} className="text-gray-500 text-xs" title="Cambiar propiedad sin reconectar OAuth">
              Cambiar
            </Button>
          )}
          {isConnected && onSync && (
            <Button variant="outline" size="sm" onClick={onSync} disabled={syncing} className="text-gray-500 text-xs" title="Sincronizar ahora">
              <Icons.RefreshCw />
              {syncing ? 'Sincronizando...' : 'Sync'}
            </Button>
          )}
          {isError && canChangeProperty && onChangeProperty && (
            <Button variant="outline" size="sm" onClick={onChangeProperty} className="text-gray-500 text-xs" title="Cambiar a otra propiedad sin reconectar OAuth">
              Cambiar propiedad
            </Button>
          )}
          {isError && onReconnect && (
            <Button size="sm" onClick={onReconnect}>Reconectar OAuth</Button>
          )}
          {isConnected ? (
            <Button variant="ghost" size="sm" onClick={onDisconnect} className="text-red-500 text-xs">
              Desconectar
            </Button>
          ) : !isError ? (
            <Button size="sm" onClick={onConnect}>Conectar</Button>
          ) : null}
        </div>
      </div>

      {/* Error detail banner */}
      {isError && lastError && (
        <div className="flex items-start gap-2 px-5 py-2.5 bg-red-50 border-t border-red-100">
          <span className="text-red-500 shrink-0 mt-0.5"><Icons.AlertTriangle size={13} /></span>
          <span className="text-xs text-red-700 leading-snug">{lastError}</span>
        </div>
      )}
    </div>
  );
}
