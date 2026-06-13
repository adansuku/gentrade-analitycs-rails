# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Integrations::GoogleAdsSync do
  let(:client) { create(:client) }
  let(:integration) do
    create(
      :integration,
      client: client,
      provider: :google,
      status: :active,
      access_token: 'valid_token',
      metadata: {
        'customer_id' => '1234567890',
        'developer_token' => 'test_dev_token'
      }
    )
  end

  let(:service) { described_class.new(integration) }
  let(:start_date) { 7.days.ago.to_date }
  let(:end_date) { Date.current }

  describe '#call' do
    context 'when integration is valid and active' do
      let(:google_ads_service) { instance_double(Google::Ads::GoogleAds::GoogleAdsClient) }
      let(:ga_service) { double }
      let(:response) do
        double(
          results: [
            double(
              segments: double(date: '2026-06-10'),
              metrics: double(
                impressions: 1000,
                clicks: 50,
                cost_micros: 25_000_000, # $25.00
                conversions: 5.0,
                ctr: 5.0,
                average_cpc: 500_000 # $0.50
              )
            )
          ]
        )
      end

      before do
        allow(Google::Ads::GoogleAds::GoogleAdsClient).to receive(:new).and_return(google_ads_service)
        allow(google_ads_service).to receive(:service).and_return(ga_service)
        allow(ga_service).to receive(:search).and_return(response)
      end

      it 'fetches and saves metrics successfully' do
        expect {
          result = service.call(start_date: start_date, end_date: end_date)
          expect(result[:success]).to be true
        }.to change { Metric.count }
      end

      it 'creates metrics with correct source' do
        service.call(start_date: start_date, end_date: end_date)

        metric = Metric.source_google_ads.first
        expect(metric.client_id).to eq(client.id)
        expect(metric.integration_id).to eq(integration.id)
        expect(metric.source).to eq('google_ads')
      end

      it 'converts micros to currency correctly' do
        service.call(start_date: start_date, end_date: end_date)

        cost_metric = Metric.source_google_ads.by_type('cost').first
        expect(cost_metric.value).to eq(25.0) # $25.00

        avg_cpc_metric = Metric.source_google_ads.by_type('avg_cpc').first
        expect(avg_cpc_metric.value).to eq(0.5) # $0.50
      end

      it 'deletes old metrics for the same date range' do
        create(
          :metric,
          client: client,
          integration: integration,
          source: :google_ads,
          date: start_date
        )

        expect {
          service.call(start_date: start_date, end_date: end_date)
        }.to change {
          Metric.source_google_ads
                .where(integration: integration)
                .for_date_range(start_date, end_date)
                .count
        }
      end
    end

    context 'when integration is not active' do
      before { integration.update(status: :inactive) }

      it 'returns an error' do
        result = service.call(start_date: start_date, end_date: end_date)
        expect(result[:success]).to be false
        expect(result[:error]).to eq('Integration is not active')
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

    context 'when customer_id is missing' do
      before { integration.update(metadata: { 'developer_token' => 'test' }) }

      it 'returns an error' do
        result = service.call(start_date: start_date, end_date: end_date)
        expect(result[:success]).to be false
        expect(result[:error]).to eq('No customer_id configured')
      end
    end

    context 'when developer_token is missing' do
      before { integration.update(metadata: { 'customer_id' => '123' }) }

      it 'returns an error' do
        result = service.call(start_date: start_date, end_date: end_date)
        expect(result[:success]).to be false
        expect(result[:error]).to eq('No developer_token configured')
      end
    end

    context 'when Google Ads API returns authorization error' do
      let(:google_ads_service) { instance_double(Google::Ads::GoogleAds::GoogleAdsClient) }
      let(:ga_service) { double }

      before do
        allow(Google::Ads::GoogleAds::GoogleAdsClient).to receive(:new).and_return(google_ads_service)
        allow(google_ads_service).to receive(:service).and_return(ga_service)
        allow(ga_service).to receive(:search).and_raise(Google::Ads::GoogleAds::Errors::GoogleAdsError.new('Auth error'))
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
end
