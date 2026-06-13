# frozen_string_literal: true

require 'koala'

module Integrations
  class MetaAdsSync
    def initialize(integration)
      @integration = integration
      @client = @integration.client
    end

    def call(start_date: 7.days.ago.to_date, end_date: Date.current)
      return error_result('Integration is not active') unless @integration.active?
      return error_result('Integration is expired') if @integration.expired?
      return error_result('Wrong provider') unless @integration.provider_meta?

      begin
        # Get ad account ID from metadata (should be configured when integration is created)
        ad_account_id = @integration.metadata['ad_account_id']
        return error_result('No ad_account_id configured') unless ad_account_id

        # Initialize Meta Graph API client
        graph = Koala::Facebook::API.new(@integration.access_token)

        # Fetch ads insights
        metrics_data = fetch_ads_insights(graph, ad_account_id, start_date, end_date)

        # Save metrics to database
        save_metrics(metrics_data, start_date, end_date)

        success_result(metrics_data)
      rescue Koala::Facebook::AuthenticationError => e
        @integration.update(status: :expired)
        error_result("Authentication failed: #{e.message}")
      rescue Koala::Facebook::ClientError => e
        error_result("Meta API error: #{e.message}")
      rescue StandardError => e
        error_result("Sync failed: #{e.message}")
      end
    end

    private

    def fetch_ads_insights(graph, ad_account_id, start_date, end_date)
      # Ensure ad_account_id has the 'act_' prefix
      account_id = ad_account_id.start_with?('act_') ? ad_account_id : "act_#{ad_account_id}"

      # Define the metrics we want to fetch
      fields = %w[
        date_start
        impressions
        clicks
        spend
        reach
        actions
        ctr
        cpc
        cpm
      ]

      # Fetch insights from Meta Ads API
      insights = graph.get_connections(
        account_id,
        'insights',
        {
          fields: fields.join(','),
          time_range: {
            since: start_date.to_s,
            until: end_date.to_s
          },
          time_increment: 1, # Daily breakdown
          level: 'account'
        }
      )

      transform_meta_response(insights)
    rescue Koala::Facebook::APIError => e
      # Handle case where account has no data
      if e.message.include?('No data available')
        {}
      else
        raise e
      end
    end

    def transform_meta_response(insights)
      data_by_date = {}

      insights.each do |insight|
        date = Date.parse(insight['date_start'])

        # Extract conversion data from actions array
        conversions = 0
        conversion_value = 0.0

        if insight['actions']
          insight['actions'].each do |action|
            if action['action_type'] == 'purchase' || action['action_type'] == 'offsite_conversion.fb_pixel_purchase'
              conversions += action['value'].to_f
            end
            if action['action_type'] == 'omni_purchase'
              conversion_value += action['value'].to_f
            end
          end
        end

        data_by_date[date] = {
          impressions: insight['impressions'].to_i,
          clicks: insight['clicks'].to_i,
          spend: insight['spend'].to_f,
          reach: insight['reach'].to_i,
          ctr: insight['ctr'].to_f,
          cpc: insight['cpc'].to_f,
          cpm: insight['cpm'].to_f,
          conversions: conversions,
          conversion_value: conversion_value
        }
      end

      data_by_date
    end

    def save_metrics(metrics_data, start_date, end_date)
      # Delete existing metrics for this date range to avoid duplicates
      @client.metrics
             .source_meta_ads
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
            source: :meta_ads,
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
