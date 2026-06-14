module Integrations
  # Shopify connector — migrated to GraphQL Admin API (paridad con el sistema Node original).
  # Lee productos con inventario, pedidos con refunds + line items, y genera/persiste alertas
  # de stock (low_stock, low_coverage) con estado persistente entre syncs.
  class ShopifySync
    DEFAULT_API_VERSION = "2026-04"

    ALERT_DEFAULTS = {
      "low_stock_threshold" => 10,
      "coverage_days" => 7,
      "velocity_window_days" => 30
    }.freeze

    MAX_ARCHIVED_ALERTS = 50

    def initialize(integration)
      @integration = integration
      @client = @integration.client
    end

    def call(start_date: 30.days.ago.to_date, end_date: Date.current)
      return error_result("Integration is not active") unless @integration.active?
      return error_result("Integration is expired") if @integration.expired?
      return error_result("Wrong provider") unless @integration.provider_shopify?

      begin
        store_domain = @integration.metadata["store_domain"]
        return error_result("No store_domain configured") unless store_domain

        products = fetch_products
        orders = fetch_orders(start_date, end_date)

        metrics_data = build_metrics_data(orders)

        save_metrics(metrics_data, start_date, end_date)
        save_period_summary(metrics_data, start_date, end_date)
        save_integration_data("products", products, period: "current")
        save_integration_data("orders", orders, period: "last_#{orders.size}")

        process_alerts(products, orders)

        success_result(metrics_data.merge(products_count: products.size))
      rescue StandardError => e
        error_result("Shopify sync failed: #{e.message}")
      end
    end

    private

    # ── GraphQL transport ────────────────────────────────────────────────

    def api_version
      @integration.metadata["api_version"] || DEFAULT_API_VERSION
    end

    def graphql_url
      store = @integration.metadata["store_domain"]
      "https://#{store}/admin/api/#{api_version}/graphql.json"
    end

    # Ejecuta una query GraphQL y devuelve el Hash parseado.
    def graphql_request(query, variables = {})
      response = HTTParty.post(
        graphql_url,
        headers: {
          "X-Shopify-Access-Token" => @integration.access_token,
          "Content-Type" => "application/json"
        },
        body: { query: query, variables: variables }.to_json
      )

      JSON.parse(response.body)
    end

    # ── Productos + inventario ───────────────────────────────────────────

    PRODUCTS_QUERY = <<~GQL.freeze
      query GetProducts($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              status
              productType
              variants(first: 100) {
                edges { node { id title price sku inventoryQuantity } }
              }
            }
          }
          pageInfo { hasNextPage }
        }
      }
    GQL

    def fetch_products(limit = 250)
      data = graphql_request(PRODUCTS_QUERY, { first: limit })
      edges = data.dig("data", "products", "edges") || []

      edges.map do |edge|
        node = edge["node"]
        variants = (node.dig("variants", "edges") || []).map do |ve|
          v = ve["node"]
          {
            id: strip_gid(v["id"]),
            title: v["title"],
            price: v["price"].to_f,
            sku: v["sku"].to_s,
            stock: v["inventoryQuantity"]
          }
        end

        {
          id: strip_gid(node["id"]),
          name: node["title"],
          status: node["status"],
          category: node["productType"].to_s,
          price: variants.first ? variants.first[:price] : 0.0,
          stock: variants.sum { |v| v[:stock].to_i },
          variants: variants
        }
      end
    end

    # ── Pedidos con refunds + line items ─────────────────────────────────

    ORDERS_QUERY = <<~GQL.freeze
      query GetOrders($first: Int!, $query: String) {
        orders(first: $first, sortKey: CREATED_AT, reverse: true, query: $query) {
          edges {
            node {
              id
              name
              currentSubtotalPriceSet { shopMoney { amount currencyCode } }
              totalRefundedSet { shopMoney { amount currencyCode } }
              displayFinancialStatus
              createdAt
              lineItems(first: 100) {
                edges { node { quantity variant { id sku title } } }
              }
            }
          }
          pageInfo { hasNextPage }
        }
      }
    GQL

    def fetch_orders(start_date, end_date, limit = 250)
      date_query = "created_at:>=#{start_date} created_at:<=#{end_date}"
      data = graphql_request(ORDERS_QUERY, { first: limit, query: date_query })
      edges = data.dig("data", "orders", "edges") || []

      edges.map do |edge|
        node = edge["node"]
        subtotal = node.dig("currentSubtotalPriceSet", "shopMoney", "amount").to_f
        refunds = node.dig("totalRefundedSet", "shopMoney", "amount").to_f
        net_sales = [0.0, (subtotal - refunds).round(2)].max

        items = (node.dig("lineItems", "edges") || []).filter_map do |le|
          li = le["node"]
          variant_id = li.dig("variant", "id") ? strip_gid(li.dig("variant", "id")) : nil
          sku = li.dig("variant", "sku").to_s
          quantity = li["quantity"].to_i
          next if variant_id.nil? && sku.empty?
          next if quantity.zero?

          { sku: sku, variant_id: variant_id, quantity: quantity }
        end

        {
          id: strip_gid(node["id"]),
          name: node["name"],
          total_price: net_sales,
          refunds: refunds,
          currency: node.dig("currentSubtotalPriceSet", "shopMoney", "currencyCode") || "EUR",
          status: node["displayFinancialStatus"],
          date: node["createdAt"],
          items: items
        }.with_indifferent_access
      end
    end

    # ── Cálculo de ventas ────────────────────────────────────────────────

    PAID_STATUSES = %w[PAID PARTIALLY_PAID].freeze

    def build_metrics_data(orders)
      breakdown = calculate_sales_breakdown(orders)
      total_orders = orders.size

      {
        total_orders: total_orders,
        total_revenue: breakdown[:net_sales],
        net_sales: breakdown[:net_sales],
        gross_sales: breakdown[:gross_sales],
        returns: breakdown[:returns],
        average_order_value: total_orders.zero? ? 0 : (breakdown[:net_sales] / total_orders).round(2),
        sales_breakdown: breakdown,
        currency: orders.first ? orders.first[:currency] : "EUR",
        orders_count: total_orders,
        revenue_this_month: breakdown[:net_sales]
      }
    end

    def calculate_sales_breakdown(orders)
      gross = 0.0
      returns = 0.0

      orders.each do |order|
        subtotal = order[:total_price].to_f + order[:refunds].to_f
        refunds = order[:refunds].to_f
        gross += subtotal
        returns += refunds
      end

      net = orders.sum { |o| [0.0, (o[:total_price].to_f)].max }

      {
        gross_sales: gross.round(2),
        net_sales: net.round(2),
        returns: returns.round(2),
        order_count: orders.size
      }
    end

    # ── Alertas ──────────────────────────────────────────────────────────

    def alert_config
      ALERT_DEFAULTS.merge(@integration.metadata.slice(*ALERT_DEFAULTS.keys))
    end

    def alerts_enabled?
      ALERT_DEFAULTS.keys.any? { |k| @integration.metadata.key?(k) }
    end

    def generate_alerts(products, orders, config = alert_config)
      alerts = []
      low_stock_threshold = config["low_stock_threshold"].to_i
      coverage_days = config["coverage_days"].to_i
      velocity_window_days = config["velocity_window_days"].to_i

      velocity_start = Time.current - velocity_window_days.days
      velocity_orders = orders.select do |o|
        paid?(o[:status]) && Time.parse(o[:date].to_s) > velocity_start
      rescue ArgumentError, TypeError
        false
      end

      sales_by_key = Hash.new(0)
      velocity_orders.each do |order|
        (order[:items] || []).each do |item|
          key = item[:sku].to_s.empty? ? item[:variant_id] : item[:sku]
          next unless key

          sales_by_key[key] += item[:quantity].to_i
        end
      end

      products.each do |product|
        (product[:variants] || []).each do |variant|
          stock = variant[:stock]
          next if stock.nil?

          if stock <= low_stock_threshold
            alerts << build_alert(
              product, variant, "low_stock",
              severity: stock <= 5 ? "critical" : "warning",
              extra: { current_stock: stock, threshold: low_stock_threshold },
              message: "Stock bajo: #{product[:name]} - #{variant[:title]} (#{stock} unidades)"
            )
          end

          key = variant[:sku].to_s.empty? ? variant[:id] : variant[:sku]
          velocity = sales_by_key[key]
          next unless velocity.positive?

          days_of_coverage = stock / (velocity.to_f / velocity_window_days)
          next unless days_of_coverage <= coverage_days

          alerts << build_alert(
            product, variant, "low_coverage",
            severity: days_of_coverage <= 3 ? "critical" : "warning",
            extra: {
              current_stock: stock, sales_velocity: velocity,
              velocity_window_days: velocity_window_days,
              days_of_coverage: days_of_coverage.round, coverage_days: coverage_days
            },
            message: "Stock cubre #{days_of_coverage.round} dias " \
                     "(#{stock} unidades, #{velocity} ventas en #{velocity_window_days} dias)"
          )
        end
      end

      alerts
    end

    def build_alert(product, variant, type, severity:, extra:, message:)
      {
        id: "#{product[:id]}-#{variant[:id]}-#{type}",
        type: type,
        severity: severity,
        status: "active",
        notes: nil,
        product_id: product[:id],
        product_name: product[:name],
        variant_id: variant[:id],
        variant_title: variant[:title],
        sku: variant[:sku],
        message: message
      }.merge(extra)
    end

    # Conserva status/notes de alertas previas (merge por id estable).
    def merge_alert_state(generated, existing)
      prev_by_id = existing.index_by { |a| stable_id(a) }

      generated.map do |alert|
        id = stable_id(alert)
        prev = prev_by_id[id]
        next alert.merge(id: id) unless prev

        alert.merge(
          id: id,
          status: prev["status"] || prev[:status] || alert[:status] || "active",
          notes: prev["notes"] || prev[:notes] || alert[:notes]
        )
      end
    end

    # Orquesta generación + merge + archivado de alertas en IntegrationDatum.
    def process_alerts(products, orders)
      return unless alerts_enabled?

      generated = generate_alerts(products, orders)
      existing = load_alert_data("alerts")
      merged = merge_alert_state(generated, existing)

      current_ids = merged.map { |a| stable_id(a) }.to_set
      missing_state = load_alert_hash("alerts_missing")
      archive = load_alert_data("alerts_archive")

      disappeared = existing.reject { |a| current_ids.include?(stable_id(a)) }

      disappeared.each do |alert|
        id = stable_id(alert)
        prev = missing_state[id] || { "missing_count" => 0, "snapshot" => alert }
        missing_state[id] = {
          "missing_count" => prev["missing_count"].to_i + 1,
          "snapshot" => alert
        }
      end

      missing_state.delete_if { |id, _| current_ids.include?(id) }

      missing_state.keys.each do |id|
        entry = missing_state[id]
        next unless entry["missing_count"].to_i >= 2

        archive.unshift(entry["snapshot"].merge("archived_reason" => "no_longer_applicable"))
        missing_state.delete(id)
      end

      archive = archive.first(MAX_ARCHIVED_ALERTS)

      save_integration_data("alerts", merged, period: "current")
      save_integration_data("alerts_missing", missing_state, period: "current")
      save_integration_data("alerts_archive", archive, period: "current")
    end

    def stable_id(alert)
      alert[:id] || alert["id"] ||
        "#{alert[:product_id] || alert['product_id']}-" \
        "#{alert[:variant_id] || alert['variant_id']}-" \
        "#{alert[:type] || alert['type']}"
    end

    def load_alert_data(category)
      dp = IntegrationDatum.find_by(integration_id: @integration.id, category: category)
      data = dp&.data
      data.is_a?(Array) ? data : []
    end

    def load_alert_hash(category)
      dp = IntegrationDatum.find_by(integration_id: @integration.id, category: category)
      data = dp&.data
      data.is_a?(Hash) ? data.dup : {}
    end

    # ── Persistencia ─────────────────────────────────────────────────────

    def save_metrics(metrics_data, _start_date, end_date)
      @client.metrics
             .source_shopify
             .where(integration: @integration)
             .for_date_range(end_date, end_date)
             .delete_all

      records = [
        metric_record("revenue", metrics_data[:net_sales], end_date, { currency: metrics_data[:currency] }),
        metric_record("orders", metrics_data[:total_orders], end_date),
        metric_record("aov", metrics_data[:average_order_value], end_date)
      ]

      Metric.insert_all(records) if records.any?
    end

    def metric_record(type, value, date, metadata = {})
      {
        client_id: @client.id,
        integration_id: @integration.id,
        source: Metric.sources[:shopify],
        metric_type: type,
        value: value,
        date: date,
        metadata: metadata,
        created_at: Time.current,
        updated_at: Time.current
      }
    end

    def save_period_summary(metrics_data, start_date, end_date)
      period_key = "#{start_date}_#{end_date}"

      save_integration_data("period_summary", metrics_data, period: period_key)
      save_integration_data("summary", metrics_data)
    end

    def save_integration_data(category, data, period: nil)
      IntegrationDatum.find_or_initialize_by(
        integration_id: @integration.id,
        category: category,
        period: period
      ).update!(
        data: data,
        fetched_at: Time.current
      )
    end

    # ── Helpers ──────────────────────────────────────────────────────────

    def strip_gid(gid)
      gid.to_s.sub(%r{gid://shopify/\w+/}, "")
    end

    def paid?(status)
      status.to_s.upcase == "PAID"
    end

    def success_result(data)
      { success: true, data: data, synced_at: Time.current }
    end

    def error_result(message)
      { success: false, error: message }
    end
  end
end
