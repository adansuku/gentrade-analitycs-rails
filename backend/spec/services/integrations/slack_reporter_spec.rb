# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Integrations::SlackReporter do
  let(:client) { create(:client, name: 'Test Client') }
  let(:integration) do
    create(
      :integration,
      client: client,
      provider: :slack,
      status: :active,
      access_token: 'xoxb-test-token'
    )
  end

  let(:messenger) { instance_double(Integrations::SlackMessenger) }
  let(:reporter) { described_class.new(integration) }
  let(:channel) { 'C123456' }

  before do
    allow(Integrations::SlackMessenger).to receive(:new).and_return(messenger)
  end

  describe '#send_metrics_report' do
    context 'when metrics exist' do
      let!(:metrics) do
        [
          create(
            :metric,
            client: client,
            integration: integration,
            source: :google_ads,
            metric_type: 'impressions',
            value: 1000,
            date: 2.days.ago.to_date
          ),
          create(
            :metric,
            client: client,
            integration: integration,
            source: :google_ads,
            metric_type: 'clicks',
            value: 50,
            date: 2.days.ago.to_date
          )
        ]
      end

      before do
        allow(messenger).to receive(:send_message).and_return({ success: true })
      end

      it 'sends a metrics report' do
        result = reporter.send_metrics_report(
          channel: channel,
          start_date: 7.days.ago.to_date,
          end_date: Date.current
        )

        expect(result[:success]).to be true
        expect(messenger).to have_received(:send_message).with(
          hash_including(
            channel: channel,
            blocks: instance_of(Array)
          )
        )
      end

      it 'includes client name in header' do
        reporter.send_metrics_report(
          channel: channel,
          start_date: 7.days.ago.to_date,
          end_date: Date.current
        )

        blocks_sent = nil
        allow(messenger).to receive(:send_message) do |args|
          blocks_sent = args[:blocks]
          { success: true }
        end

        reporter.send_metrics_report(
          channel: channel,
          start_date: 7.days.ago.to_date,
          end_date: Date.current
        )

        header_block = blocks_sent&.first
        expect(header_block[:text][:text]).to include('Test Client')
      end
    end

    context 'when no metrics exist' do
      before do
        allow(messenger).to receive(:send_message).and_return({ success: true })
      end

      it 'sends a "no data" message' do
        result = reporter.send_metrics_report(
          channel: channel,
          start_date: 7.days.ago.to_date,
          end_date: Date.current
        )

        expect(result[:success]).to be true
        expect(messenger).to have_received(:send_message).with(
          hash_including(
            channel: channel,
            text: /No hay métricas disponibles/
          )
        )
      end
    end
  end

  describe '#send_daily_summary' do
    context 'when today has metrics' do
      let!(:metrics) do
        [
          create(
            :metric,
            client: client,
            integration: integration,
            source: :meta_ads,
            metric_type: 'spend',
            value: 150.75,
            date: Date.current
          ),
          create(
            :metric,
            client: client,
            integration: integration,
            source: :meta_ads,
            metric_type: 'conversions',
            value: 10,
            date: Date.current
          )
        ]
      end

      before do
        allow(messenger).to receive(:send_message).and_return({ success: true })
      end

      it 'sends a daily summary' do
        result = reporter.send_daily_summary(channel: channel)

        expect(result[:success]).to be true
        expect(messenger).to have_received(:send_message).with(
          hash_including(
            channel: channel,
            blocks: instance_of(Array)
          )
        )
      end
    end

    context 'when today has no metrics' do
      before do
        allow(messenger).to receive(:send_message).and_return({ success: true })
      end

      it 'sends a "no data" message' do
        result = reporter.send_daily_summary(channel: channel)

        expect(result[:success]).to be true
        expect(messenger).to have_received(:send_message).with(
          hash_including(
            channel: channel,
            text: /No hay métricas disponibles para hoy/
          )
        )
      end
    end
  end

  describe '#send_comparison_report' do
    context 'with week period' do
      let!(:current_week_metrics) do
        [
          create(
            :metric,
            client: client,
            integration: integration,
            source: :google_analytics,
            metric_type: 'sessions',
            value: 500,
            date: 3.days.ago.to_date
          )
        ]
      end

      let!(:previous_week_metrics) do
        [
          create(
            :metric,
            client: client,
            integration: integration,
            source: :google_analytics,
            metric_type: 'sessions',
            value: 400,
            date: 10.days.ago.to_date
          )
        ]
      end

      before do
        allow(messenger).to receive(:send_message).and_return({ success: true })
      end

      it 'sends a comparison report' do
        result = reporter.send_comparison_report(
          channel: channel,
          period: :week
        )

        expect(result[:success]).to be true
        expect(messenger).to have_received(:send_message).with(
          hash_including(
            channel: channel,
            blocks: instance_of(Array)
          )
        )
      end
    end

    context 'with month period' do
      before do
        allow(messenger).to receive(:send_message).and_return({ success: true })
      end

      it 'sends a monthly comparison report' do
        result = reporter.send_comparison_report(
          channel: channel,
          period: :month
        )

        expect(result[:success]).to be true
      end
    end

    context 'with invalid period' do
      it 'returns an error' do
        result = reporter.send_comparison_report(
          channel: channel,
          period: :invalid
        )

        expect(result[:success]).to be false
        expect(result[:error]).to eq('Invalid period')
      end
    end
  end

  describe '#format_metric_value' do
    it 'formats currency values' do
      value = reporter.send(:format_metric_value, 'cost', 125.50)
      expect(value).to eq('$125.5')
    end

    it 'formats percentage values' do
      value = reporter.send(:format_metric_value, 'ctr', 5.25)
      expect(value).to eq('5.25%')
    end

    it 'formats duration values' do
      value = reporter.send(:format_metric_value, 'avg_session_duration', 180.75)
      expect(value).to eq('181s')
    end

    it 'formats count values with thousands separator' do
      value = reporter.send(:format_metric_value, 'impressions', 12345.67)
      expect(value).to eq('12,345')
    end
  end

  describe '#calculate_percentage_change' do
    it 'calculates positive change' do
      change = reporter.send(:calculate_percentage_change, 100, 150)
      expect(change).to eq(50.0)
    end

    it 'calculates negative change' do
      change = reporter.send(:calculate_percentage_change, 100, 75)
      expect(change).to eq(-25.0)
    end

    it 'handles zero old value' do
      change = reporter.send(:calculate_percentage_change, 0, 100)
      expect(change).to eq(0)
    end
  end
end
