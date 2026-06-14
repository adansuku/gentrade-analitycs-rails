# frozen_string_literal: true

require 'rails_helper'

RSpec.describe SlackReportJob, type: :job do
  let(:client) { create(:client) }
  let(:integration) do
    create(
      :integration,
      client: client,
      provider: :slack,
      status: :active,
      access_token: 'xoxb-test-token',
      metadata: { 'default_channel' => 'C123456' }
    )
  end

  let(:reporter) { instance_double(Integrations::SlackReporter) }
  let(:channel) { 'C123456' }

  before do
    allow(Integrations::SlackReporter).to receive(:new).and_return(reporter)
  end

  describe '#perform' do
    context 'with daily_summary report type' do
      before do
        allow(reporter).to receive(:send_daily_summary)
          .and_return({ success: true })
      end

      it 'sends a daily summary' do
        described_class.perform_now(
          integration.id,
          report_type: 'daily_summary',
          channel: channel
        )

        expect(reporter).to have_received(:send_daily_summary)
          .with(channel: channel)
      end

      it 'updates integration metadata on success' do
        described_class.perform_now(
          integration.id,
          report_type: 'daily_summary',
          channel: channel
        )

        integration.reload
        expect(integration.metadata['last_report_sent_at']).not_to be_nil
        expect(integration.metadata['last_report_type']).to eq('daily_summary')
        expect(integration.metadata['last_report_result']).to eq('success')
      end
    end

    context 'with metrics_report report type' do
      before do
        allow(reporter).to receive(:send_metrics_report)
          .and_return({ success: true })
      end

      it 'sends a metrics report with date range' do
        described_class.perform_now(
          integration.id,
          report_type: 'metrics_report',
          channel: channel,
          start_date: '2026-06-01',
          end_date: '2026-06-10'
        )

        expect(reporter).to have_received(:send_metrics_report)
          .with(
            channel: channel,
            start_date: '2026-06-01',
            end_date: '2026-06-10'
          )
      end
    end

    context 'with comparison_report report type' do
      before do
        allow(reporter).to receive(:send_comparison_report)
          .and_return({ success: true })
      end

      it 'sends a comparison report with period' do
        described_class.perform_now(
          integration.id,
          report_type: 'comparison_report',
          channel: channel,
          period: :week
        )

        expect(reporter).to have_received(:send_comparison_report)
          .with(
            channel: channel,
            period: :week
          )
      end

      it 'defaults to week period' do
        described_class.perform_now(
          integration.id,
          report_type: 'comparison_report',
          channel: channel
        )

        expect(reporter).to have_received(:send_comparison_report)
          .with(
            channel: channel,
            period: :week
          )
      end
    end

    context 'when channel is not provided' do
      it 'uses default_channel from metadata' do
        allow(reporter).to receive(:send_daily_summary)
          .and_return({ success: true })

        described_class.perform_now(
          integration.id,
          report_type: 'daily_summary'
        )

        expect(reporter).to have_received(:send_daily_summary)
          .with(channel: 'C123456')
      end
    end

    context 'when no channel is available' do
      before do
        integration.update(metadata: {})
        allow(reporter).to receive(:send_daily_summary)
      end

      it 'logs an error and returns early' do
        expect(Rails.logger).to receive(:error)
          .with(/No channel specified/)

        described_class.perform_now(
          integration.id,
          report_type: 'daily_summary'
        )

        expect(reporter).not_to have_received(:send_daily_summary)
      end
    end

    context 'when integration is not Slack' do
      before do
        integration.update(provider: :google)
        allow(reporter).to receive(:send_daily_summary)
      end

      it 'logs an error and returns early' do
        expect(Rails.logger).to receive(:error)
          .with(/non-Slack integration/)

        described_class.perform_now(
          integration.id,
          report_type: 'daily_summary',
          channel: channel
        )

        expect(reporter).not_to have_received(:send_daily_summary)
      end
    end

    context 'when report type is unknown' do
      before do
        allow(reporter).to receive(:send_daily_summary)
      end

      it 'records an error' do
        described_class.perform_now(
          integration.id,
          report_type: 'unknown_type',
          channel: channel
        )

        integration.reload
        expect(integration.metadata['last_report_result']).to eq('error')
        expect(integration.metadata['last_report_error']).to include('Unknown report type')
      end
    end

    context 'when sending report fails' do
      before do
        allow(reporter).to receive(:send_daily_summary)
          .and_return({ success: false, error: 'Channel not found' })
      end

      it 'records the error in metadata' do
        described_class.perform_now(
          integration.id,
          report_type: 'daily_summary',
          channel: channel
        )

        integration.reload
        expect(integration.metadata['last_report_result']).to eq('error')
        expect(integration.metadata['last_report_error']).to eq('Channel not found')
      end

      it 'logs the error' do
        expect(Rails.logger).to receive(:error)
          .with(/Failed to send daily_summary report via Slack/)

        described_class.perform_now(
          integration.id,
          report_type: 'daily_summary',
          channel: channel
        )
      end
    end

    context 'when integration is not found' do
      it 'raises ActiveRecord::RecordNotFound' do
        expect {
          described_class.perform_now(999_999)
        }.to raise_error(ActiveRecord::RecordNotFound)
      end
    end
  end
end
