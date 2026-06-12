/**
 * connectionConfig — field schemas for API-key / credentials modals
 * Used by ConnectionModal inside IntegrationPanel
 */

export const CONNECTION_FIELDS = {
  mailchimp: [
    { name: 'apiKey', label: 'API Key', type: 'password', placeholder: 'xxxxxxxx-usXX', required: true },
  ],
  klaviyo: [
    { name: 'apiKey', label: 'API Key (Private)', type: 'password', required: true },
  ],
  hubspot: [
    { name: 'apiKey', label: 'Private App Token', type: 'password', required: true },
  ],
  pipedrive: [
    { name: 'apiToken', label: 'API Token', type: 'password', required: true },
    { name: 'companyDomain', label: 'Company Domain', type: 'text', placeholder: 'miempresa', required: true },
  ],
  stripe: [
    { name: 'secretKey', label: 'Secret Key', type: 'password', placeholder: 'sk_...', required: true },
  ],
  paypal: [
    { name: 'clientId', label: 'Client ID', type: 'text', required: true },
    { name: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
  ],
  woocommerce: [
    { name: 'siteUrl', label: 'URL de la tienda', type: 'url', placeholder: 'https://mitienda.com', required: true },
    { name: 'consumerKey', label: 'Consumer Key', type: 'text', required: true },
    { name: 'consumerSecret', label: 'Consumer Secret', type: 'password', required: true },
  ],
  shopify: [
    { name: 'shop', label: 'Dominio de la tienda', type: 'text', placeholder: 'mitienda.myshopify.com', required: true },
  ],
  holded: [
    { name: 'apiKey', label: 'API Key', type: 'password', required: true },
  ],
  prestashop: [
    { name: 'siteUrl', label: 'URL de la tienda', type: 'url', placeholder: 'https://mitienda.com', required: true },
    { name: 'apiKey', label: 'API Key', type: 'password', required: true },
  ],
  pagespeed: [
    { name: 'targetUrl', label: 'URL a analizar', type: 'url', placeholder: 'https://miempresa.com', required: true },
  ],
  amazon_seller: [
    { name: 'sellerId', label: 'Seller ID', type: 'text', required: true },
    { name: 'accessKey', label: 'Access Key', type: 'text', required: true },
    { name: 'secretKey', label: 'Secret Key', type: 'password', required: true },
    { name: 'region', label: 'Region (p.ej. eu-west-1)', type: 'text', placeholder: 'eu-west-1', required: true },
  ],
};
