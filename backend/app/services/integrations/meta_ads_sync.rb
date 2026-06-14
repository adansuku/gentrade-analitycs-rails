# frozen_string_literal: true

require 'koala'

module Integrations
  class MetaAdsSync
    API_VERSION = 'v19.0'

    def initialize(integration)
      @integration = integration
      @client = @integration.client
    end

    def call(start_date: 7.days.ago.to_date, end_date: Date.current)
      return error_result('Integration is not active') unless @integration.active?
      return error_result('Integration is expired') if @integration.expired?
      return error_result('Wrong provider') unless @integration.provider_meta?

      begin
        ad_account_id = normalized_ad_account_id
        return error_result('No ad_account_id configured') unless ad_account_id

        graph = Koala::Facebook::API.new(@integration.access_token)

        campaigns = fetch_campaigns_for_range(graph, ad_account_id, start_date, end_date)
        period_summary = build_period_summary(campaigns)

        save_metrics_from_campaigns(campaigns, start_date, end_date)
        save_integration_data(campaigns, period_summary, start_date, end_date)

        success_result(period_summary.merge(campaigns_count: campaigns.size))
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

    def normalized_ad_account_id
      raw = @integration.metadata['ad_account_id']
      return nil unless raw

      raw.start_with?('act_') ? raw : "act_#{raw}"
    end

    def fetch_campaigns_for_range(graph, ad_account_id, start_date, end_date)
      insight_fields = %w[
        campaign_id campaign_name spend reach impressions clicks cpc cpm ctr actions action_values
      ].join(',')

      insights = graph.get_connections(
        ad_account_id,
        'insights',
        fields: insight_fields,
        time_range: { since: start_date.to_s, until: end_date.to_s }.to_json,
        level: 'campaign',
        limit: 500
      )

      campaign_meta = fetch_campaign_metadata(graph, ad_account_id)

      (insights || []).map do |row|
        purchases = (row['actions'] || []).find { |a| a['action_type'] == 'purchase' }
        purchase_values = (row['action_values'] || []).find { |a| a['action_type'] == 'purchase' }
        leads = (row['actions'] || []).find { |a| a['action_type'] == 'lead' }
        meta = campaign_meta[row['campaign_id']] || {}

        {
          'id' => row['campaign_id'],
          'name' => row['campaign_name'],
          'status' => meta['status'],
          'objective' => meta['objective'],
          'spend' => row['spend'].to_f.round(2),
          'clicks' => row['clicks'].to_i,
          'impressions' => row['impressions'].to_i,
          'reach' => row['reach'].to_i,
          'conversions' => purchases ? purchases['value'].to_i : 0,
          'conversion_value' => purchase_values ? purchase_values['value'].to_f : 0.0,
          'leads' => leads ? leads['value'].to_i : 0,
          'cpc' => row['cpc'].to_f,
          'cpm' => row['cpm'].to_f,
          'ctr' => row['ctr'].to_f
        }
      end.sort_by { |c| -c['spend'] }
    rescue Koala::Facebook::APIError => e
      raise e unless e.message.include?('No data available')

      []
    end

    def fetch_campaign_metadata(graph, ad_account_id)
      campaigns = graph.get_connections(
        ad_account_id,
        'campaigns',
        fields: 'id,name,objective,status',
        limit: 250
      )

      (campaigns || []).each_with_object({}) do |c, meta|
        meta[c['id']] = { 'objective' => c['objective'], 'status' => c['status'] }
      end
    rescue Koala::Facebook::APIError => e
      Rails.logger.warn "Could not fetch Meta campaign metadata: #{e.message}"
      {}
    end

    def build_period_summary(campaigns)
      total_spend = campaigns.sum { |c| c['spend'] }.round(2)
      total_clicks = campaigns.sum { |c| c['clicks'] }
      total_impressions = campaigns.sum { |c| c['impressions'] }
      total_reach = campaigns.sum { |c| c['reach'] }
      total_conversions = campaigns.sum { |c| c['conversions'] }
      total_leads = campaigns.sum { |c| c['leads'] }

      leads_campaigns = campaigns.select { |c| leads_campaign?(c) }
      leads_only_spend = leads_campaigns.sum { |c| c['spend'] }.round(2)
      leads_only_leads = leads_campaigns.sum { |c| c['leads'] }

      {
        'total_spend' => total_spend,
        'total_clicks' => total_clicks,
        'total_impressions' => total_impressions,
        'total_reach' => total_reach,
        'total_conversions' => total_conversions,
        'total_leads' => total_leads,
        'leads_only_spend' => leads_only_spend,
        'leads_only_cpl' => leads_only_leads > 0 ? (leads_only_spend / leads_only_leads).round(2) : 0,
        'avg_cpc' => total_clicks > 0 ? (total_spend / total_clicks).round(2) : 0,
        'avg_cpm' => total_impressions > 0 ? (total_spend / total_impressions * 1000).round(2) : 0,
        'avg_ctr' => total_impressions > 0 ? (total_clicks.to_f / total_impressions * 100).round(2) : 0,
        'cpl' => total_leads > 0 ? (total_spend / total_leads).round(2) : 0,
        'fetched_at' => Time.current.iso8601
      }
    end

    def leads_campaign?(campaign)
      campaign['objective'] == 'LEADS' || campaign['name'].to_s.match?(/\bleads?\b/i)
    end

    def save_metrics_from_campaigns(campaigns, start_date, end_date)
      @client.metrics
             .source_meta_ads
             .where(integration: @integration)
             .for_date_range(start_date, end_date)
             .delete_all

      return if campaigns.empty?

      total_spend = campaigns.sum { |c| c['spend'] }.round(2)
      total_clicks = campaigns.sum { |c| c['clicks'] }
      total_impressions = campaigns.sum { |c| c['impressions'] }
      total_conversions = campaigns.sum { |c| c['conversions'] }

      records = [
        { client_id: @client.id, integration_id: @integration.id, source: :meta_ads, metric_type: 'spend', value: total_spend, date: end_date, metadata: {}, created_at: Time.current, updated_at: Time.current },
        { client_id: @client.id, integration_id: @integration.id, source: :meta_ads, metric_type: 'clicks', value: total_clicks, date: end_date, metadata: {}, created_at: Time.current, updated_at: Time.current },
        { client_id: @client.id, integration_id: @integration.id, source: :meta_ads, metric_type: 'impressions', value: total_impressions, date: end_date, metadata: {}, created_at: Time.current, updated_at: Time.current },
        { client_id: @client.id, integration_id: @integration.id, source: :meta_ads, metric_type: 'conversions', value: total_conversions, date: end_date, metadata: {}, created_at: Time.current, updated_at: Time.current }
      ]

      Metric.insert_all(records)
    end

    def save_integration_data(campaigns, period_summary, start_date, end_date)
      period_key = "#{start_date}_#{end_date}"

      IntegrationDatum.find_or_initialize_by(
        integration_id: @integration.id, category: 'campaigns', period: period_key
      ).update!(data: campaigns, fetched_at: Time.current)

      IntegrationDatum.find_or_initialize_by(
        integration_id: @integration.id, category: 'period_summary', period: period_key
      ).update!(data: period_summary, fetched_at: Time.current)

      IntegrationDatum.find_or_initialize_by(
        integration_id: @integration.id, category: 'campaigns'
      ).update!(data: campaigns, fetched_at: Time.current)

      IntegrationDatum.find_or_initialize_by(
        integration_id: @integration.id, category: 'summary'
      ).update!(data: period_summary, fetched_at: Time.current)
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
