# frozen_string_literal: true

require 'google/ads/google_ads'

module Integrations
  class GoogleAdsSync
    def initialize(integration)
      @integration = integration
      @client = @integration.client
    end

    def call(start_date: 7.days.ago.to_date, end_date: Date.current)
      return error_result('Integration is not active') unless @integration.active?
      return error_result('Integration is expired') if @integration.expired?
      return error_result('Wrong provider') unless @integration.provider_google?

      begin
        # Get customer ID and developer token from metadata (configured when integration is created)
        customer_id = @integration.metadata['customer_id']
        return error_result('No customer_id configured') unless customer_id

        developer_token = @integration.metadata['developer_token']
        return error_result('No developer_token configured') unless developer_token

        # Initialize Google Ads API client
        google_ads_client = build_google_ads_client(developer_token)

        # Fetch ads data
        metrics_data = fetch_ads_data(google_ads_client, customer_id, start_date, end_date)

        # Save metrics to database
        save_metrics(metrics_data, start_date, end_date)

        success_result(metrics_data)
      rescue Google::Ads::GoogleAds::Errors::GoogleAdsError => e
        handle_google_ads_error(e)
      rescue StandardError => e
        error_result("Sync failed: #{e.message}")
      end
    end

    # Lista las cuentas Google Ads accesibles con la credencial, para que el usuario
    # elija cuál conectar al configurar la integración (paridad con el selector de
    # cuentas del sistema original; NO realiza sync multi-cuenta).
    def list_accessible_customers
      developer_token = @integration.metadata['developer_token']
      return [] unless developer_token

      client = build_google_ads_client(developer_token)

      fetch_accessible_customer_ids(client).map do |customer_id|
        fetch_customer_info(client, customer_id)
      end
    rescue Google::Ads::GoogleAds::Errors::GoogleAdsError, StandardError => e
      Rails.logger.warn "Google Ads list customers failed: #{e.message}"
      []
    end

    private

    def build_google_ads_client(developer_token)
      Google::Ads::GoogleAds::GoogleAdsClient.new do |config|
        config.refresh_token = @integration.refresh_token
        config.client_id = ENV['GOOGLE_CLIENT_ID']
        config.client_secret = ENV['GOOGLE_CLIENT_SECRET']
        config.developer_token = developer_token
      end
    end

    # Devuelve los IDs de cuenta accesibles, normalizados (sin prefijo "customers/").
    def fetch_accessible_customer_ids(client)
      response = client.service.customer.list_accessible_customers
      (response.resource_names || []).map { |rn| rn.to_s.sub('customers/', '') }
    end

    # Obtiene nombre/moneda/manager de una cuenta; fallback a { id, name: id } si falla.
    def fetch_customer_info(client, customer_id)
      rows = client.service.google_ads.search(
        customer_id: customer_id.to_s,
        query: 'SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.manager FROM customer LIMIT 1'
      )
      row = rows.first
      customer = row&.customer

      {
        'id' => customer_id.to_s,
        'name' => customer&.descriptive_name.presence || customer_id.to_s,
        'currency_code' => customer&.currency_code,
        'manager' => customer&.manager || false
      }
    rescue StandardError
      { 'id' => customer_id.to_s, 'name' => customer_id.to_s }
    end

    def fetch_ads_data(client, customer_id, start_date, end_date)
      query = <<~QUERY
        SELECT
          segments.date,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.ctr,
          metrics.average_cpc
        FROM campaign
        WHERE segments.date BETWEEN '#{start_date}' AND '#{end_date}'
        AND campaign.status = 'ENABLED'
      QUERY

      response = client.service.search(
        customer_id: customer_id.to_s,
        query: query,
        page_size: 10000
      )

      transform_ads_response(response)
    end

    def transform_ads_response(response)
      data_by_date = {}

      response.results.each do |row|
        date_str = row.segments.date
        date = Date.parse(date_str)

        # Aggregate metrics by date
        data_by_date[date] ||= {
          impressions: 0,
          clicks: 0,
          cost: 0.0,
          conversions: 0.0,
          ctr: 0.0,
          avg_cpc: 0.0
        }

        data_by_date[date][:impressions] += row.metrics.impressions
        data_by_date[date][:clicks] += row.metrics.clicks
        data_by_date[date][:cost] += (row.metrics.cost_micros / 1_000_000.0) # Convert micros to currency
        data_by_date[date][:conversions] += row.metrics.conversions
      end

      # Calculate averages
      data_by_date.each do |date, values|
        if values[:impressions] > 0
          values[:ctr] = (values[:clicks].to_f / values[:impressions] * 100).round(2)
        end
        if values[:clicks] > 0
          values[:avg_cpc] = (values[:cost] / values[:clicks]).round(2)
        end
      end

      data_by_date
    end

    def save_metrics(metrics_data, start_date, end_date)
      # Delete existing metrics for this date range to avoid duplicates
      @client.metrics
             .source_google_ads
             .where(integration: @integration)
             .for_date_range(start_date, end_date)
             .delete_all

      metrics_to_create = []

      metrics_data.each do |date, values|
        # Create metric records for each metric type
        values.each do |metric_type, value|
          metrics_to_create << {
            client_id: @client.id,
            integration_id: @integration.id,
            source: :google_ads,
            metric_type: metric_type.to_s,
            value: value,
            date: date,
            metadata: {},
            created_at: Time.current,
            updated_at: Time.current
          }
        end
      end

      # Bulk insert for efficiency
      Metric.insert_all(metrics_to_create) if metrics_to_create.any?

      {
        total_records: metrics_to_create.size,
        date_range: "#{start_date} to #{end_date}"
      }
    end

    def handle_google_ads_error(error)
      failure = error.failure

      error_message = if failure.respond_to?(:errors)
                         failure.errors.map(&:message).join(', ')
                       else
                         failure.to_s
                       end

      @integration.update(status: :expired)

      error_result("Authorization failed: #{error_message}")
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
