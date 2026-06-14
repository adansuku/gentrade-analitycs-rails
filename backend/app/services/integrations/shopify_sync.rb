module Integrations
  class ShopifySync
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

        metrics_data = fetch_shopify_data(store_domain, start_date, end_date)

        save_metrics(metrics_data, start_date, end_date)

        save_period_summary(metrics_data, start_date, end_date)

        success_result(metrics_data)
      rescue StandardError => e
        error_result("Shopify sync failed: #{e.message}")
      end
    end

    private

    def shopify_client
      @shopify_client ||= HTTP.headers(
        "X-Shopify-Access-Token" => @integration.access_token,
        "Content-Type" => "application/json"
      )
    end

    def shopify_base_url
      store = @integration.metadata["store_domain"]
      "https://#{store}/admin/api/#{api_version}"
    end

    def api_version
      @integration.metadata["api_version"] || "2024-01"
    end

    def fetch_shopify_data(store_domain, start_date, end_date)
      orders = fetch_orders(start_date, end_date)
      sales_breakdown = calculate_sales_breakdown(orders)

      {
        total_orders: orders.size,
        total_revenue: sales_breakdown[:net_sales],
        total_discounts: sales_breakdown[:discounts],
        gross_sales: sales_breakdown[:gross_sales],
        net_sales: sales_breakdown[:net_sales],
        returns: sales_breakdown[:returns],
        average_order_value: orders.empty? ? 0 : (sales_breakdown[:net_sales] / orders.size).round(2),
        sales_breakdown: sales_breakdown,
        currency: "EUR",
        orders_count: orders.size,
        revenue_this_month: sales_breakdown[:net_sales]
      }
    end

    def fetch_orders(start_date, end_date)
      all_orders = []
      page_info = nil

      loop do
        params = {
          status: "any",
          created_at_min: start_date.to_s,
          created_at_max: end_date.to_s,
          limit: 250,
          fields: "id,created_at,total_price,subtotal_price,discounts,total_discounts,financial_status"
        }
        params[:page_info] = page_info if page_info

        response = shopify_client.get("#{shopify_base_url}/orders.json", params: params)

        if response.status.success?
          data = JSON.parse(response.body)
          orders = data["orders"] || []
          all_orders.concat(orders)

          link_header = response.headers["Link"]
          break unless link_header&.include?("rel=\"next\"")

          page_info = link_header.match(/page_info=([^>]+)/)&.[](1)
          break unless page_info
        else
          Rails.logger.warn "Shopify API error: #{response.status} - #{response.body}"
          break
        end
      end

      all_orders
    rescue => e
      Rails.logger.warn "Shopify fetch orders failed: #{e.message}"
      []
    end

    def calculate_sales_breakdown(orders)
      gross = 0.0
      discounts = 0.0
      returns = 0.0

      orders.each do |order|
        total = order["total_price"].to_f
        discount = order["total_discounts"].to_f

        if order["financial_status"] == "refunded"
          returns += total
        else
          gross += total + discount
          discounts += discount
        end
      end

      net = gross - discounts - returns

      {
        gross_sales: gross.round(2),
        discounts: discounts.round(2),
        net_sales: net.round(2),
        returns: returns.round(2),
        order_count: orders.size
      }
    end

    def save_metrics(metrics_data, start_date, end_date)
      @client.metrics
             .source_shopify
             .where(integration: @integration)
             .for_date_range(start_date, end_date)
             .delete_all

      records = [
        { client_id: @client.id, integration_id: @integration.id, source: :shopify, metric_type: "revenue", value: metrics_data[:net_sales], date: end_date, metadata: { currency: "EUR" }, created_at: Time.current, updated_at: Time.current },
        { client_id: @client.id, integration_id: @integration.id, source: :shopify, metric_type: "orders", value: metrics_data[:total_orders], date: end_date, metadata: {}, created_at: Time.current, updated_at: Time.current },
        { client_id: @client.id, integration_id: @integration.id, source: :shopify, metric_type: "aov", value: metrics_data[:average_order_value], date: end_date, metadata: {}, created_at: Time.current, updated_at: Time.current }
      ]

      Metric.insert_all(records) if records.any?
    end

    def save_period_summary(metrics_data, start_date, end_date)
      period_key = "#{start_date}_#{end_date}"

      IntegrationDatum.find_or_initialize_by(
        integration_id: @integration.id,
        category: "period_summary",
        period: period_key
      ).update!(
        data: metrics_data,
        fetched_at: Time.current
      )

      IntegrationDatum.find_or_initialize_by(
        integration_id: @integration.id,
        category: "summary"
      ).update!(
        data: metrics_data,
        fetched_at: Time.current
      )
    end

    def success_result(data)
      {
        success: true,
        data: data,
        synced_at: Time.current
      }
    end

    def error_result(message)
      {
        success: false,
        error: message
      }
    end
  end
end
