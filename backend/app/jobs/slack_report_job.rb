# frozen_string_literal: true

class SlackReportJob < ApplicationJob
  queue_as :default
  retry_on StandardError, wait: :polynomially_longer, attempts: 3
  retry_on ActiveRecord::RecordNotFound, attempts: 1

  def perform(integration_id, report_type: 'daily_summary', channel: nil, **options)
    integration = Integration.find(integration_id)

    unless integration.provider_slack?
      Rails.logger.error "SlackReportJob called with non-Slack integration: #{integration.id}"
      return
    end

    # Get channel from integration metadata if not provided
    channel ||= integration.metadata['default_channel']

    unless channel
      Rails.logger.error "No channel specified for SlackReportJob: integration #{integration.id}"
      return
    end

    reporter = Integrations::SlackReporter.new(integration)

    result = case report_type.to_s
             when 'daily_summary'
               reporter.send_daily_summary(channel: channel)
             when 'metrics_report'
               reporter.send_metrics_report(
                 channel: channel,
                 start_date: options[:start_date],
                 end_date: options[:end_date]
               )
             when 'comparison_report'
               reporter.send_comparison_report(
                 channel: channel,
                 period: options[:period] || :week
               )
             else
               {
                 success: false,
                 error: "Unknown report type: #{report_type}"
               }
             end

    if result[:success]
      integration.update(
        metadata: integration.metadata.merge(
          last_report_sent_at: Time.current,
          last_report_type: report_type,
          last_report_result: 'success'
        )
      )
      Rails.logger.info "Successfully sent #{report_type} report via Slack: integration #{integration.id}"
    else
      integration.update(
        metadata: integration.metadata.merge(
          last_report_sent_at: Time.current,
          last_report_type: report_type,
          last_report_result: 'error',
          last_report_error: result[:error]
        )
      )
      Rails.logger.error "Failed to send #{report_type} report via Slack: #{result[:error]}"
    end

    result
  end
end
