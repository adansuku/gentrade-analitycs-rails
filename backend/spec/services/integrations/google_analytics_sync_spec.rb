# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Integrations::GoogleAnalyticsSync do
  let(:client) { create(:client) }
  let(:integration) do
    create(
      :integration,
      client: client,
      provider: :google,
      status: :active,
      access_token: 'valid_token',
      metadata: { 'property_id' => '123456789' }
    )
  end

  let(:service) { described_class.new(integration) }
  let(:start_date) { 7.days.ago.to_date }
  let(:end_date) { Date.current }

  describe '#call' do
    context 'when integration is valid and active' do
      let(:analytics_service) { instance_double(Google::Apis::AnalyticsdataV1beta::AnalyticsDataService) }
      let(:response) do
        double(
          rows: [
            double(
              dimension_values: [double(value: '20260610')],
              metric_values: [
                double(value: '150'),   # sessions
                double(value: '120'),   # activeUsers
                double(value: '450'),   # screenPageViews
                double(value: '45.5'),  # bounceRate
                double(value: '180')    # averageSessionDuration
              ]
            )
          ]
        )
      end

      before do
        allow(Google::Apis::AnalyticsdataV1beta::AnalyticsDataService).to receive(:new)
          .and_return(analytics_service)
        allow(analytics_service).to receive(:authorization=)
        allow(analytics_service).to receive(:run_property_report).and_return(response)
      end

      it 'fetches and saves metrics successfully' do
        expect {
          result = service.call(start_date: start_date, end_date: end_date)
          expect(result[:success]).to be true
        }.to change { Metric.count }
      end

      it 'creates metrics with correct attributes' do
        service.call(start_date: start_date, end_date: end_date)

        metric = Metric.source_google_analytics.first
        expect(metric.client_id).to eq(client.id)
        expect(metric.integration_id).to eq(integration.id)
        expect(metric.source).to eq('google_analytics')
      end

      it 'deletes old metrics for the same date range' do
        # Create existing metric
        create(
          :metric,
          client: client,
          integration: integration,
          source: :google_analytics,
          date: start_date
        )

        expect {
          service.call(start_date: start_date, end_date: end_date)
        }.to change {
          Metric.source_google_analytics
                .where(integration: integration)
                .for_date_range(start_date, end_date)
                .count
        }
      end
    end

    context 'when integration is not active' do
      before { integration.update(status: :revoked) }

      it 'returns an error' do
        result = service.call(start_date: start_date, end_date: end_date)
        expect(result[:success]).to be false
        expect(result[:error]).to eq('Integration is not active')
      end

      it 'does not create any metrics' do
        expect {
          service.call(start_date: start_date, end_date: end_date)
        }.not_to change { Metric.count }
      end
    end

    context 'when integration is expired' do
      before do
        integration.update(
          expires_at: 1.day.ago,
          status: :active
        )
      end

      it 'returns an error' do
        result = service.call(start_date: start_date, end_date: end_date)
        expect(result[:success]).to be false
        expect(result[:error]).to eq('Integration is expired')
      end
    end

    context 'when integration is not Google' do
      before { integration.update(provider: :meta) }

      it 'returns an error' do
        result = service.call(start_date: start_date, end_date: end_date)
        expect(result[:success]).to be false
        expect(result[:error]).to eq('Wrong provider')
      end
    end

    context 'when property_id is missing' do
      before { integration.update(metadata: {}) }

      it 'returns an error' do
        result = service.call(start_date: start_date, end_date: end_date)
        expect(result[:success]).to be false
        expect(result[:error]).to eq('No property_id configured')
      end
    end

    context 'when Google API returns authorization error' do
      let(:analytics_service) { instance_double(Google::Apis::AnalyticsdataV1beta::AnalyticsDataService) }

      before do
        allow(Google::Apis::AnalyticsdataV1beta::AnalyticsDataService).to receive(:new)
          .and_return(analytics_service)
        allow(analytics_service).to receive(:authorization=)
        allow(analytics_service).to receive(:run_property_report)
          .and_raise(Google::Apis::AuthorizationError.new('Invalid token'))
      end

      it 'marks integration as expired' do
        expect {
          service.call(start_date: start_date, end_date: end_date)
        }.to change { integration.reload.status }.to('expired')
      end

      it 'returns an error' do
        result = service.call(start_date: start_date, end_date: end_date)
        expect(result[:success]).to be false
        expect(result[:error]).to include('Authorization failed')
      end
    end
  end

  describe '#fetch_top_pages' do
    let(:analytics_service) { instance_double(Google::Apis::AnalyticsdataV1beta::AnalyticsDataService) }
    let(:response) do
      double(
        rows: [
          double(
            dimension_values: [double(value: '/inicio')],
            metric_values: [double(value: '450'), double(value: '300'), double(value: '180.5')]
          ),
          double(
            dimension_values: [double(value: '/productos')],
            metric_values: [double(value: '220'), double(value: '150'), double(value: '95.0')]
          )
        ]
      )
    end

    before do
      allow(Google::Apis::AnalyticsdataV1beta::AnalyticsDataService).to receive(:new).and_return(analytics_service)
      allow(analytics_service).to receive(:authorization=)
      allow(analytics_service).to receive(:run_property_report).and_return(response)
    end

    it 'devuelve las paginas mas vistas con sus metricas' do
      pages = service.fetch_top_pages(start_date, end_date)

      expect(pages.size).to eq(2)
      expect(pages.first).to eq(
        "page" => '/inicio', "views" => 450, "users" => 300, "avg_duration" => 180.5
      )
    end

    it 'devuelve [] si no hay property_id' do
      integration.update!(metadata: {})
      expect(service.fetch_top_pages(start_date, end_date)).to eq([])
    end
  end

  describe '#fetch_traffic_sources' do
    let(:analytics_service) { instance_double(Google::Apis::AnalyticsdataV1beta::AnalyticsDataService) }
    let(:response) do
      double(
        rows: [
          double(
            dimension_values: [double(value: 'google'), double(value: 'organic')],
            metric_values: [double(value: '500'), double(value: '420')]
          )
        ]
      )
    end

    before do
      allow(Google::Apis::AnalyticsdataV1beta::AnalyticsDataService).to receive(:new).and_return(analytics_service)
      allow(analytics_service).to receive(:authorization=)
      allow(analytics_service).to receive(:run_property_report).and_return(response)
    end

    it 'devuelve las fuentes de trafico con source y medium' do
      sources = service.fetch_traffic_sources(start_date, end_date)

      expect(sources.size).to eq(1)
      expect(sources.first).to eq(
        "source" => 'google', "medium" => 'organic', "sessions" => 500, "users" => 420
      )
    end

    it 'devuelve [] si no hay property_id' do
      integration.update!(metadata: {})
      expect(service.fetch_traffic_sources(start_date, end_date)).to eq([])
    end
  end
end
