class BackfillJob < ApplicationJob
  queue_as :default
  retry_on StandardError, wait: :polynomially_longer, attempts: 2

  MAX_MONTHS = 12

  def perform(integration_id, auto: false)
    integration = Integration.find(integration_id)
    client = integration.client

    sync_service = resolve_sync_service(integration)
    unless sync_service
      fail_backfill(integration_id, "No sync service for #{integration.provider}")
      return
    end

    today = Date.current
    total_months = MAX_MONTHS
    success_count = 0
    error_count = 0

    (0...total_months).each do |offset|
      month_date = today << offset
      start_date = month_date.beginning_of_month
      end_date = [month_date.end_of_month, today].min

      Rails.logger.info "Backfill #{integration.provider} (#{integration.id}): #{start_date} to #{end_date}"

      begin
        result = sync_service.call(start_date: start_date, end_date: end_date)
        if result[:success]
          success_count += 1
        else
          error_count += 1
          Rails.logger.warn "Backfill month #{start_date} failed: #{result[:error]}"
        end
      rescue => e
        error_count += 1
        Rails.logger.warn "Backfill month #{start_date} error: #{e.message}"
      end

      progress = (((offset + 1).to_f / total_months) * 100).round
      update_progress(integration_id, progress, success_count:, error_count:)
    end

    final_status = error_count > 0 && success_count == 0 ? "failed" : "completed"
    finalize_backfill(integration_id, final_status, success_count:, error_count:)
  rescue ActiveRecord::RecordNotFound => e
    Rails.logger.error "BackfillJob: Integration not found #{integration_id}"
    fail_backfill(integration_id, "Integration not found")
  rescue => e
    Rails.logger.error "BackfillJob failed: #{e.message}"
    fail_backfill(integration_id, e.message)
  end

  private

  def resolve_sync_service(integration)
    case integration.provider
    when "shopify"
      Integrations::ShopifySync.new(integration)
    when "meta"
      Integrations::MetaAdsSync.new(integration)
    when "google"
      nil
    else
      nil
    end
  end

  def update_progress(integration_id, progress, success_count:, error_count:)
    state = Rails.cache.read("backfill_#{integration_id}") || {}
    state.merge!(
      "progress" => progress,
      "success_count" => success_count,
      "error_count" => error_count,
      "updated_at" => Time.current.iso8601
    )
    Rails.cache.write("backfill_#{integration_id}", state, expires_in: 1.hour)
  end

  def finalize_backfill(integration_id, status, success_count:, error_count:)
    state = Rails.cache.read("backfill_#{integration_id}") || {}
    state.merge!(
      "status" => status,
      "progress" => 100,
      "success_count" => success_count,
      "error_count" => error_count,
      "completed_at" => Time.current.iso8601
    )
    Rails.cache.write("backfill_#{integration_id}", state, expires_in: 1.hour)
    Rails.logger.info "Backfill #{integration_id} #{status}: #{success_count} months ok, #{error_count} errors"
  end

  def fail_backfill(integration_id, error)
    state = Rails.cache.read("backfill_#{integration_id}") || {}
    state.merge!(
      "status" => "failed",
      "error" => error,
      "completed_at" => Time.current.iso8601
    )
    Rails.cache.write("backfill_#{integration_id}", state, expires_in: 1.hour)
  end
end
