# frozen_string_literal: true

require 'google/apis/analyticsdata_v1beta'

module Integrations
  class GoogleAnalyticsSync
    def initialize(integration)
      @integration = integration
      @client = @integration.client
    end

    def call(start_date: 7.days.ago.to_date, end_date: Date.current)
      return error_result('Integration is not active') unless @integration.active?
      return error_result('Integration is expired') if @integration.expired?
      return error_result('Wrong provider') unless @integration.provider_google?

      begin
        # Initialize Google Analytics API client
        service = Google::Apis::AnalyticsdataV1beta::AnalyticsDataService.new
        service.authorization = @integration.access_token

        # Get property ID from metadata (should be configured when integration is created)
        property_id = @integration.metadata['property_id']
        return error_result('No property_id configured') unless property_id

        # Fetch analytics data
        metrics_data = fetch_analytics_data(service, property_id, start_date, end_date)

        # Save metrics to database
        save_metrics(metrics_data, start_date, end_date)

        success_result(metrics_data)
      rescue Google::Apis::AuthorizationError => e
        @integration.update(status: :expired)
        error_result("Authorization failed: #{e.message}")
      rescue Google::Apis::Error => e
        error_result("Google API error: #{e.message}")
      rescue StandardError => e
        error_result("Sync failed: #{e.message}")
      end
    end

    def fetch_channel_breakdown(start_date, end_date)
      property_id = @integration.metadata["property_id"]
      return [] unless property_id

      service = analytics_service

      request = Google::Apis::AnalyticsdataV1beta::RunReportRequest.new(
        date_ranges: [
          Google::Apis::AnalyticsdataV1beta::DateRange.new(start_date: start_date.to_s, end_date: end_date.to_s)
        ],
        dimensions: [
          Google::Apis::AnalyticsdataV1beta::Dimension.new(name: 'sessionDefaultChannelGroup')
        ],
        metrics: [
          Google::Apis::AnalyticsdataV1beta::Metric.new(name: 'sessions'),
          Google::Apis::AnalyticsdataV1beta::Metric.new(name: 'totalUsers'),
          Google::Apis::AnalyticsdataV1beta::Metric.new(name: 'conversions')
        ],
        order_bys: [
          Google::Apis::AnalyticsdataV1beta::OrderBy.new(
            metric: Google::Apis::AnalyticsdataV1beta::MetricOrderBy.new(metric_name: 'sessions'),
            desc: true
          )
        ],
        limit: 15
      )

      response = service.run_report("properties/#{property_id}", request)

      (response.rows || []).map do |row|
        {
          "channel" => row.dimension_values[0].value,
          "sessions" => row.metric_values[0].value.to_i,
          "users" => row.metric_values[1].value.to_i,
          "conversions" => row.metric_values[2].value.to_i
        }
      end
    rescue => e
      Rails.logger.warn "Channel breakdown failed: #{e.message}"
      []
    end

    def fetch_ecommerce_events(start_date, end_date)
      property_id = @integration.metadata["property_id"]
      return nil unless property_id

      service = analytics_service

      request = Google::Apis::AnalyticsdataV1beta::RunReportRequest.new(
        date_ranges: [
          Google::Apis::AnalyticsdataV1beta::DateRange.new(start_date: start_date.to_s, end_date: end_date.to_s)
        ],
        dimensions: [
          Google::Apis::AnalyticsdataV1beta::Dimension.new(name: 'eventName')
        ],
        metrics: [
          Google::Apis::AnalyticsdataV1beta::Metric.new(name: 'eventCount')
        ],
        dimension_filter: Google::Apis::AnalyticsdataV1beta::FilterExpression.new(
          filter: Google::Apis::AnalyticsdataV1beta::Filter.new(
            field_name: 'eventName',
            in_list_filter: Google::Apis::AnalyticsdataV1beta::InListFilter.new(
              values: %w[view_item add_to_cart begin_checkout purchase]
            )
          )
        )
      )

      response = service.run_report("properties/#{property_id}", request)

      counts = { "view_item" => 0, "add_to_cart" => 0, "begin_checkout" => 0, "purchase" => 0 }
      (response.rows || []).each do |row|
        name = row.dimension_values&.[](0)&.value
        count = row.metric_values&.[](0)&.value.to_i
        counts[name] = count if counts.key?(name)
      end

      {
        "views" => counts["view_item"],
        "carts" => counts["add_to_cart"],
        "checkouts" => counts["begin_checkout"],
        "orders" => counts["purchase"],
        "has_data" => counts.values.any? { |v| v > 0 }
      }
    rescue => e
      Rails.logger.warn "Ecommerce events fetch failed: #{e.message}"
      nil
    end

    private

    def analytics_service
      service = Google::Apis::AnalyticsdataV1beta::AnalyticsDataService.new
      service.authorization = @integration.access_token
      service
    end

    def fetch_analytics_data(service, property_id, start_date, end_date)
      request = Google::Apis::AnalyticsdataV1beta::RunReportRequest.new(
        date_ranges: [
          Google::Apis::AnalyticsdataV1beta::DateRange.new(
            start_date: start_date.to_s,
            end_date: end_date.to_s
          )
        ],
        dimensions: [
          Google::Apis::AnalyticsdataV1beta::Dimension.new(name: 'date')
        ],
        metrics: [
          Google::Apis::AnalyticsdataV1beta::Metric.new(name: 'sessions'),
          Google::Apis::AnalyticsdataV1beta::Metric.new(name: 'activeUsers'),
          Google::Apis::AnalyticsdataV1beta::Metric.new(name: 'screenPageViews'),
          Google::Apis::AnalyticsdataV1beta::Metric.new(name: 'bounceRate'),
          Google::Apis::AnalyticsdataV1beta::Metric.new(name: 'averageSessionDuration')
        ]
      )

      response = service.run_report("properties/#{property_id}", request)

      # Transform response to hash
      transform_analytics_response(response)
    end

    def transform_analytics_response(response)
      data_by_date = {}

      response.rows&.each do |row|
        date_str = row.dimension_values[0].value
        date = Date.parse(date_str)

        data_by_date[date] = {
          sessions: row.metric_values[0].value.to_i,
          users: row.metric_values[1].value.to_i,
          page_views: row.metric_values[2].value.to_i,
          bounce_rate: row.metric_values[3].value.to_f,
          avg_session_duration: row.metric_values[4].value.to_f
        }
      end

      data_by_date
    end

    def save_metrics(metrics_data, start_date, end_date)
      # Delete existing metrics for this date range to avoid duplicates
      @client.metrics
             .source_google_analytics
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
            source: :google_analytics,
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
