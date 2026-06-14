# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Integrations::MetaAdsSync do
  let(:client) { create(:client) }
  let(:integration) do
    create(
      :integration,
      client: client,
      provider: :meta,
      status: :active,
      access_token: 'valid_meta_token',
      metadata: { 'ad_account_id' => 'act_123456789' }
    )
  end

  let(:service) { described_class.new(integration) }
  let(:start_date) { 7.days.ago.to_date }
  let(:end_date) { Date.current }

  describe '#call' do
    context 'when integration is valid and active' do
      let(:graph_api) { instance_double(Koala::Facebook::API) }
      let(:insights_data) do
        [
          {
            'campaign_id' => '999',
            'campaign_name' => 'Test Campaign',
            'spend' => '125.50',
            'reach' => '4500',
            'impressions' => '5000',
            'clicks' => '250',
            'cpc' => '0.50',
            'cpm' => '25.10',
            'ctr' => '5.0',
            'actions' => [{ 'action_type' => 'purchase', 'value' => '15' }],
            'action_values' => [{ 'action_type' => 'purchase', 'value' => '300' }]
          }
        ]
      end
      let(:campaigns_data) do
        [
          { 'id' => '999', 'name' => 'Test Campaign', 'objective' => 'CONVERSIONS', 'status' => 'ACTIVE' }
        ]
      end

      before do
        allow(Koala::Facebook::API).to receive(:new).and_return(graph_api)
        allow(graph_api).to receive(:get_connections)
          .with(anything, 'insights', anything)
          .and_return(insights_data)
        allow(graph_api).to receive(:get_connections)
          .with(anything, 'campaigns', anything)
          .and_return(campaigns_data)
        allow(graph_api).to receive(:get_connections)
          .with(anything, 'ads', anything)
          .and_return([])
      end

      it 'fetches and saves metrics successfully' do
        expect {
          result = service.call(start_date: start_date, end_date: end_date)
          expect(result[:success]).to be true
        }.to change { Metric.count }
      end

      it 'creates metrics with correct source' do
        service.call(start_date: start_date, end_date: end_date)

        metric = Metric.source_meta_ads.first
        expect(metric.client_id).to eq(client.id)
        expect(metric.integration_id).to eq(integration.id)
        expect(metric.source).to eq('meta_ads')
      end

      it 'converts string values to decimals correctly' do
        service.call(start_date: start_date, end_date: end_date)

        spend_metric = Metric.source_meta_ads.by_type('spend').first
        expect(spend_metric.value).to eq(125.5)

        clicks_metric = Metric.source_meta_ads.by_type('clicks').first
        expect(clicks_metric.value).to eq(250)
      end

      it 'stores all expected metric types' do
        service.call(start_date: start_date, end_date: end_date)

        expected_types = %w[impressions clicks spend conversions]
        stored_types = Metric.source_meta_ads.metric_types

        expected_types.each do |type|
          expect(stored_types).to include(type)
        end
      end

      it 'deletes old metrics for the same date range' do
        create(
          :metric,
          client: client,
          integration: integration,
          source: :meta_ads,
          date: start_date
        )

        expect {
          service.call(start_date: start_date, end_date: end_date)
        }.to change {
          Metric.source_meta_ads
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

    context 'when integration is not Meta' do
      before { integration.update(provider: :google) }

      it 'returns an error' do
        result = service.call(start_date: start_date, end_date: end_date)
        expect(result[:success]).to be false
        expect(result[:error]).to eq('Wrong provider')
      end
    end

    context 'when ad_account_id is missing' do
      before { integration.update(metadata: {}) }

      it 'returns an error' do
        result = service.call(start_date: start_date, end_date: end_date)
        expect(result[:success]).to be false
        expect(result[:error]).to eq('No ad_account_id configured')
      end
    end

    context 'when Meta API returns authorization error' do
      let(:graph_api) { instance_double(Koala::Facebook::API) }

      before do
        allow(Koala::Facebook::API).to receive(:new).and_return(graph_api)
        allow(graph_api).to receive(:get_connections)
          .and_raise(Koala::Facebook::AuthenticationError.new(400, 'Invalid OAuth token'))
      end

      it 'marks integration as expired' do
        expect {
          service.call(start_date: start_date, end_date: end_date)
        }.to change { integration.reload.status }.to('expired')
      end

      it 'returns an error' do
        result = service.call(start_date: start_date, end_date: end_date)
        expect(result[:success]).to be false
        expect(result[:error]).to include('Authentication failed')
      end
    end
  end

  describe '#fetch_creatives' do
    let(:graph_api) { instance_double(Koala::Facebook::API) }
    let(:ads_data) do
      [
        {
          'id' => 'ad_1',
          'name' => 'Anuncio Verano',
          'status' => 'ACTIVE',
          'creative' => {
            'title' => 'Rebajas de verano',
            'body' => 'Hasta 50% de descuento',
            'thumbnail_url' => 'https://example.com/thumb.jpg',
            'effective_object_story_id' => '123_456'
          }
        },
        {
          'id' => 'ad_2',
          'name' => 'Anuncio sin creative',
          'status' => 'PAUSED'
          # sin 'creative' → title/body/thumbnail_url deben ser nil
        }
      ]
    end

    before do
      allow(graph_api).to receive(:get_connections)
        .with('act_123456789', 'ads', hash_including(limit: 25))
        .and_return(ads_data)
    end

    it 'mapea los anuncios a la estructura esperada' do
      creatives = service.send(:fetch_creatives, graph_api, 'act_123456789')

      expect(creatives.size).to eq(2)
      expect(creatives.first).to eq(
        'id' => 'ad_1',
        'name' => 'Anuncio Verano',
        'status' => 'ACTIVE',
        'title' => 'Rebajas de verano',
        'body' => 'Hasta 50% de descuento',
        'thumbnail_url' => 'https://example.com/thumb.jpg'
      )
    end

    it 'usa nil cuando faltan campos de creative' do
      creatives = service.send(:fetch_creatives, graph_api, 'act_123456789')

      expect(creatives.last).to include(
        'id' => 'ad_2', 'title' => nil, 'body' => nil, 'thumbnail_url' => nil
      )
    end

    it 'devuelve [] ante error de la API' do
      allow(graph_api).to receive(:get_connections)
        .with('act_123456789', 'ads', hash_including(limit: 25))
        .and_raise(Koala::Facebook::APIError.new(400, 'boom'))

      expect(service.send(:fetch_creatives, graph_api, 'act_123456789')).to eq([])
    end
  end
end
