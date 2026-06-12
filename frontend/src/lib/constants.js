export const API_BASE = '';

// App branding — reads from env, falls back to defaults
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'GENTRADE';
export const APP_TAGLINE = import.meta.env.VITE_APP_TAGLINE || 'Asistente Comercial Inteligente';
export const APP_URL = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');

// ─── Integration types, categories, colors and icons ───────────────────

export const INTEGRATION_TYPES = {
  // Existing
  google_analytics: { label: 'Google Analytics', category: 'analytics', color: '#4285F4', icon: 'BarChart3', description: 'Sesiones, usuarios, tasa de rebote, conversiones' },
  shopify: { label: 'Shopify', category: 'ecommerce', color: '#96BF48', icon: 'ShoppingBag', description: 'Ventas, productos, inventario' },
  holded: { label: 'Holded', category: 'ecommerce', color: '#6C5CE7', icon: 'FileSpreadsheet', description: 'Facturación y contabilidad' },
  csv: { label: 'CSV', category: 'ecommerce', color: '#10b981', icon: 'FileUp', description: 'Importación manual de datos' },
  // Ads
  google_ads: { label: 'Google Ads', category: 'ads', color: '#4285F4', icon: 'Megaphone', description: 'Campañas, ROAS, keywords que convierten' },
  meta_ads: { label: 'Meta Ads', category: 'ads', color: '#1877F2', icon: 'Megaphone', description: 'Coste, alcance, conversiones, creatividades' },
  tiktok_ads: { label: 'TikTok Ads', category: 'ads', color: '#000000', icon: 'Megaphone', description: 'Campañas, conversiones, CTR' },
  // Email Marketing
  mailchimp: { label: 'Mailchimp', category: 'email', color: '#FFE01B', icon: 'Mail', description: 'Tasa de apertura, clicks, campañas activas' },
  klaviyo: { label: 'Klaviyo', category: 'email', color: '#2E2E2E', icon: 'Mail', description: 'Segmentación por comportamiento de compra' },
  // CRM
  hubspot: { label: 'HubSpot', category: 'crm', color: '#FF7A59', icon: 'Users', description: 'Pipeline de ventas, deals, contactos' },
  pipedrive: { label: 'Pipedrive', category: 'crm', color: '#017737', icon: 'Users', description: 'Deals, actividades comerciales' },
  // Payments
  stripe: { label: 'Stripe', category: 'payments', color: '#635BFF', icon: 'CreditCard', description: 'Ingresos reales, suscripciones, MRR, churn' },
  paypal: { label: 'PayPal', category: 'payments', color: '#003087', icon: 'CreditCard', description: 'Transacciones y pagos' },
  // Ecommerce
  amazon_seller: { label: 'Amazon Seller', category: 'ecommerce', color: '#FF9900', icon: 'ShoppingBag', description: 'Ventas en marketplace, stock FBA, Buy Box' },
  woocommerce: { label: 'WooCommerce', category: 'ecommerce', color: '#96588A', icon: 'ShoppingBag', description: 'Pedidos, productos, clientes' },
  prestashop: { label: 'PrestaShop', category: 'ecommerce', color: '#DF0067', icon: 'ShoppingBag', description: 'Pedidos, productos, catálogo' },
  // Social
  instagram_business: { label: 'Instagram Business', category: 'social', color: '#E1306C', icon: 'Heart', description: 'Seguidores, engagement, mejores posts' },
  google_business: { label: 'Google Business', category: 'social', color: '#4285F4', icon: 'MapPin', description: 'Reseñas, visitas al perfil, búsquedas locales' },
  // Web Performance
  search_console: { label: 'Search Console', category: 'seo', color: '#34A853', icon: 'Search', description: 'Posiciones SEO, clicks, impresiones, CTR' },
  pagespeed: { label: 'PageSpeed', category: 'seo', color: '#34A853', icon: 'Gauge', description: 'Core Web Vitals, rendimiento técnico' },
};

export const INTEGRATION_CATEGORIES = {
  analytics: { label: 'Web Analytics', icon: 'BarChart3', color: '#4285F4' },
  ads: { label: 'Publicidad', icon: 'Megaphone', color: '#FF6B35' },
  email: { label: 'Email Marketing', icon: 'Mail', color: '#FFE01B' },
  crm: { label: 'CRM y Ventas', icon: 'Users', color: '#FF7A59' },
  payments: { label: 'Pagos', icon: 'CreditCard', color: '#635BFF' },
  ecommerce: { label: 'Ecommerce', icon: 'ShoppingBag', color: '#96BF48' },
  social: { label: 'Redes Sociales', icon: 'Heart', color: '#E1306C' },
  seo: { label: 'Web Performance', icon: 'Gauge', color: '#34A853' },
};

// Integration auth method: 'oauth_google', 'oauth_meta', 'oauth_tiktok', 'oauth_shopify', 'api_key', 'credentials', 'none'
export const INTEGRATION_AUTH = {
  google_analytics: 'oauth_google',
  google_ads: 'oauth_google',
  search_console: 'oauth_google',
  google_business: 'oauth_google',
  meta_ads: 'oauth_meta',
  instagram_business: 'oauth_meta',
  tiktok_ads: 'oauth_tiktok',
  shopify: 'oauth_shopify',
  holded: 'api_key',
  mailchimp: 'api_key',
  klaviyo: 'api_key',
  hubspot: 'api_key',
  pipedrive: 'credentials',
  stripe: 'api_key',
  paypal: 'credentials',
  amazon_seller: 'credentials',
  woocommerce: 'credentials',
  prestashop: 'credentials',
  csv: 'none',
  pagespeed: 'none',
};
