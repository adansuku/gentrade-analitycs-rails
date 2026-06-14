# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Integrations::ShopifySync do
  let(:client) { create(:client) }
  let(:integration) do
    create(
      :integration,
      client: client,
      provider: :shopify,
      status: :active,
      access_token: 'valid_shopify_token',
      metadata: { 'store_domain' => 'test-store.myshopify.com' }
    )
  end

  let(:service) { described_class.new(integration) }
  let(:start_date) { 30.days.ago.to_date }
  let(:end_date) { Date.current }

  # GraphQL responses are returned as parsed Hashes by the graphql_request helper.
  def products_response(products)
    { 'data' => { 'products' => { 'edges' => products, 'pageInfo' => { 'hasNextPage' => false } } } }
  end

  def orders_response(orders)
    { 'data' => { 'orders' => { 'edges' => orders, 'pageInfo' => { 'hasNextPage' => false } } } }
  end

  def product_edge(id:, title:, variants:)
    {
      'node' => {
        'id' => "gid://shopify/Product/#{id}",
        'title' => title,
        'status' => 'ACTIVE',
        'productType' => 'Default',
        'variants' => {
          'edges' => variants.map do |v|
            {
              'node' => {
                'id' => "gid://shopify/ProductVariant/#{v[:id]}",
                'title' => v[:title],
                'price' => v[:price].to_s,
                'sku' => v[:sku],
                'inventoryQuantity' => v[:stock]
              }
            }
          end
        }
      }
    }
  end

  def order_edge(id:, name:, subtotal:, refunded: 0, status: 'PAID', date: Time.current.iso8601, items: [])
    {
      'node' => {
        'id' => "gid://shopify/Order/#{id}",
        'name' => name,
        'currentSubtotalPriceSet' => { 'shopMoney' => { 'amount' => subtotal.to_s, 'currencyCode' => 'EUR' } },
        'totalRefundedSet' => { 'shopMoney' => { 'amount' => refunded.to_s, 'currencyCode' => 'EUR' } },
        'displayFinancialStatus' => status,
        'createdAt' => date,
        'lineItems' => {
          'edges' => items.map do |it|
            {
              'node' => {
                'quantity' => it[:quantity],
                'variant' => { 'id' => "gid://shopify/ProductVariant/#{it[:variant_id]}", 'sku' => it[:sku], 'title' => 'v' }
              }
            }
          end
        }
      }
    }
  end

  describe '#fetch_products' do
    it 'parses products and variants with inventory' do
      allow(service).to receive(:graphql_request).and_return(
        products_response([
          product_edge(id: '100', title: 'Camiseta', variants: [
            { id: '200', title: 'S', price: 19.99, sku: 'CAM-S', stock: 8 },
            { id: '201', title: 'M', price: 19.99, sku: 'CAM-M', stock: 50 }
          ])
        ])
      )

      products = service.send(:fetch_products)

      expect(products.size).to eq(1)
      p = products.first
      expect(p[:id]).to eq('100')
      expect(p[:name]).to eq('Camiseta')
      expect(p[:stock]).to eq(58) # suma de inventario de variantes
      expect(p[:variants].size).to eq(2)
      expect(p[:variants].first).to include(id: '200', sku: 'CAM-S', stock: 8, price: 19.99)
    end
  end

  describe '#fetch_orders (net sales con refunds)' do
    it 'calcula total_price por pedido = max(0, subtotal - refunds)' do
      allow(service).to receive(:graphql_request).and_return(
        orders_response([
          order_edge(id: '1', name: '#1', subtotal: 100, refunded: 30, status: 'PAID'),
          order_edge(id: '2', name: '#2', subtotal: 50, refunded: 60, status: 'PARTIALLY_REFUNDED') # net >= 0
        ])
      )

      orders = service.send(:fetch_orders, start_date, end_date)

      expect(orders[0][:total_price]).to eq(70.0) # 100 - 30
      expect(orders[1][:total_price]).to eq(0.0)  # max(0, 50 - 60)

      breakdown = service.send(:calculate_sales_breakdown, orders)
      expect(breakdown[:net_sales]).to eq(70.0)
    end
  end

  describe '#generate_alerts' do
    let(:config) { { 'low_stock_threshold' => 10, 'coverage_days' => 7, 'velocity_window_days' => 30 } }

    it 'genera alerta low_stock critical cuando stock <= 5' do
      products = [{ id: '1', name: 'P', variants: [{ id: 'v1', title: 'S', sku: 'SKU1', stock: 3 }] }]
      alerts = service.send(:generate_alerts, products, [], config)

      low = alerts.find { |a| a[:type] == 'low_stock' }
      expect(low).not_to be_nil
      expect(low[:severity]).to eq('critical')
      expect(low[:id]).to eq('1-v1-low_stock')
    end

    it 'genera alerta low_stock warning cuando 5 < stock <= 10' do
      products = [{ id: '1', name: 'P', variants: [{ id: 'v1', title: 'S', sku: 'SKU1', stock: 9 }] }]
      alerts = service.send(:generate_alerts, products, [], config)

      expect(alerts.find { |a| a[:type] == 'low_stock' }[:severity]).to eq('warning')
    end

    it 'NO genera low_stock cuando stock > threshold' do
      products = [{ id: '1', name: 'P', variants: [{ id: 'v1', title: 'S', sku: 'SKU1', stock: 50 }] }]
      alerts = service.send(:generate_alerts, products, [], config)
      expect(alerts.select { |a| a[:type] == 'low_stock' }).to be_empty
    end

    it 'genera alerta low_coverage basada en velocidad de ventas' do
      # stock 20, vende 100 en 30 dias => coverage = 20 / (100/30) = 6 dias <= 7
      products = [{ id: '1', name: 'P', variants: [{ id: 'v1', title: 'S', sku: 'SKU1', stock: 20 }] }]
      orders = [
        { status: 'PAID', date: Time.current.iso8601, items: [{ sku: 'SKU1', variant_id: 'v1', quantity: 100 }] }
      ].map(&:with_indifferent_access)

      alerts = service.send(:generate_alerts, products, orders, config)
      cov = alerts.find { |a| a[:type] == 'low_coverage' }
      expect(cov).not_to be_nil
      expect(cov[:id]).to eq('1-v1-low_coverage')
    end
  end

  describe '#merge_alert_state' do
    it 'conserva status y notes de alertas existentes' do
      existing = [{ 'id' => '1-v1-low_stock', 'type' => 'low_stock', 'status' => 'resolved', 'notes' => 'pedido hecho' }]
      generated = [{ id: '1-v1-low_stock', type: 'low_stock', status: 'active', notes: nil }]

      merged = service.send(:merge_alert_state, generated, existing)

      expect(merged.first[:status]).to eq('resolved')
      expect(merged.first[:notes]).to eq('pedido hecho')
    end
  end

  describe '#call' do
    before do
      allow(service).to receive(:graphql_request) do |query, _vars|
        if query.include?('products')
          products_response([
            product_edge(id: '1', title: 'P', variants: [{ id: 'v1', title: 'S', price: 10, sku: 'SKU1', stock: 3 }])
          ])
        else
          orders_response([
            order_edge(id: '10', name: '#1001', subtotal: 100, refunded: 0, status: 'PAID',
                       items: [{ sku: 'SKU1', variant_id: 'v1', quantity: 2 }])
          ])
        end
      end
    end

    it 'sincroniza productos, pedidos y persiste en IntegrationDatum' do
      result = service.call(start_date: start_date, end_date: end_date)

      expect(result[:success]).to be true
      expect(IntegrationDatum.find_by(integration: integration, category: 'products')).not_to be_nil
      expect(IntegrationDatum.find_by(integration: integration, category: 'orders')).not_to be_nil
    end

    it 'guarda metricas revenue/orders/aov (sin regresion)' do
      service.call(start_date: start_date, end_date: end_date)

      expect(Metric.source_shopify.by_type('revenue').count).to be >= 1
      expect(Metric.source_shopify.by_type('orders').count).to be >= 1
    end

    it 'genera y persiste alertas cuando hay config de alertas' do
      integration.update!(metadata: integration.metadata.merge('low_stock_threshold' => 10))
      service.call(start_date: start_date, end_date: end_date)

      alerts_dp = IntegrationDatum.find_by(integration: integration, category: 'alerts')
      expect(alerts_dp).not_to be_nil
      expect(alerts_dp.data).to be_present
    end

    it 'devuelve error si la integracion no esta activa' do
      integration.update!(status: :revoked)
      result = service.call(start_date: start_date, end_date: end_date)
      expect(result[:success]).to be false
    end
  end
end
