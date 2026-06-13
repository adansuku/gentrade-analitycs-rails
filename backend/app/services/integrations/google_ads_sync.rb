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
        # Get customer ID from metadata (should be configured when integration is created)
        customer_id = @integration.metadata['ads_customer_id']
        return error_result('No ads_customer_id configured') unless customer_id

        # Initialize Google Ads API client
        google_ads_client = Google::Ads::GoogleAds::GoogleAdsClient.new do |config|
          config.refresh_token = @integration.refresh_token
          config.client_id = ENV['GOOGLE_CLIENT_ID']
          config.client_secret = ENV['GOOGLE_CLIENT_SECRET']
          config.developer_token = ENV['GOOGLE_ADS_DEVELOPER_TOKEN']
        end

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

    private

    def fetch_ads_data(client, customer_id, start_date, end_date)
      query = <<~QUERY
        SELECT
          segments.date,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value,
          metrics.ctr,
          metrics.average_cpc
        FROM campaign
        WHERE segments.date BETWEEN '#{start_date}' AND '#{end_date}'
        AND campaign.status = 'ENABLED'
      QUERY

      response = client.service.google_ads.search(
        customer_id: customer_id.to_s,
        query: query,
        page_size: 10000
      )

      transform_ads_response(response)
    end

    def transform_ads_response(response)
      data_by_date = {}

      response.each do |row|
        date_str = row.segments.date
        date = Date.parse(date_str)

        # Aggregate metrics by date
        data_by_date[date] ||= {
          impressions: 0,
          clicks: 0,
          cost: 0.0,
          conversions: 0.0,
          conversion_value: 0.0,
          ctr: 0.0,
          avg_cpc: 0.0
        }

        data_by_date[date][:impressions] += row.metrics.impressions
        data_by_date[date][:clicks] += row.metrics.clicks
        data_by_date[date][:cost] += (row.metrics.cost_micros / 1_000_000.0) # Convert micros to currency
        data_by_date[date][:conversions] += row.metrics.conversions
        data_by_date[date][:conversion_value] += row.metrics.conversions_value
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
      error_message = error.failure.errors.map(&:message).join(', ')

      # Mark integration as error if authorization fails
      if error_message.include?('AUTHENTICATION_ERROR') || error_message.include?('AUTHORIZATION_ERROR')
        @integration.update(status: :error)
      end

      error_result("Google Ads API error: #{error_message}")
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
