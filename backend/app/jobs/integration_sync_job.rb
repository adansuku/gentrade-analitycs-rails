# frozen_string_literal: true

class IntegrationSyncJob < ApplicationJob
  queue_as :default
  retry_on StandardError, wait: :polynomially_longer, attempts: 3

  def perform(integration_id, start_date: nil, end_date: nil)
    integration = Integration.find(integration_id)

    # Default to last 7 days if not specified
    start_date ||= 7.days.ago.to_date
    end_date ||= Date.current

    Rails.logger.info "Syncing integration #{integration.id} (#{integration.provider}) for #{integration.client.name}"

    result = case integration.provider
             when 'google'
               sync_google_integration(integration, start_date, end_date)
             when 'meta'
               Integrations::MetaAdsSync.new(integration).call(
                 start_date: start_date,
                 end_date: end_date
               )
             else
               { success: false, error: "Unsupported provider: #{integration.provider}" }
             end

    if result[:success]
      integration.update(
        metadata: integration.metadata.merge(
          last_sync_at: Time.current,
          last_sync_result: 'success'
        )
      )
      Rails.logger.info "Successfully synced integration #{integration.id}"
    else
      integration.update(
        metadata: integration.metadata.merge(
          last_sync_at: Time.current,
          last_sync_result: 'error',
          last_sync_error: result[:error]
        )
      )
      Rails.logger.error "Failed to sync integration #{integration.id}: #{result[:error]}"
    end

    result
  end

  private

  def sync_google_integration(integration, start_date, end_date)
    # For Google, sync both Analytics and Ads if configured
    results = {}

    # Sync Google Analytics if property_id is configured
    if integration.metadata['property_id'].present?
      analytics_result = Integrations::GoogleAnalyticsSync.new(integration).call(
        start_date: start_date,
        end_date: end_date
      )
      results[:analytics] = analytics_result
    end

    # Sync Google Ads if ads_customer_id is configured
    if integration.metadata['ads_customer_id'].present?
      ads_result = Integrations::GoogleAdsSync.new(integration).call(
        start_date: start_date,
        end_date: end_date
      )
      results[:ads] = ads_result
    end

    # Return combined result
    if results.values.any? { |r| r[:success] == false }
      failed = results.select { |_k, v| v[:success] == false }
      {
        success: false,
        error: "Some syncs failed: #{failed.keys.join(', ')}",
        results: results
      }
    else
      {
        success: true,
        results: results
      }
    end
  end
end
