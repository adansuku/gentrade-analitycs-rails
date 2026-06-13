# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Api::V1::MetricsController, type: :controller do
  let(:client) { create(:client) }
  let(:integration) do
    create(
      :integration,
      client: client,
      provider: :google,
      status: :active
    )
  end

  describe 'GET #index' do
    let!(:metrics) do
      [
        create(
          :metric,
          client: client,
          integration: integration,
          source: :google_analytics,
          metric_type: 'sessions',
          value: 100,
          date: 2.days.ago.to_date
        ),
        create(
          :metric,
          client: client,
          integration: integration,
          source: :google_ads,
          metric_type: 'clicks',
          value: 50,
          date: 1.day.ago.to_date
        )
      ]
    end

    it 'returns all metrics for the client' do
      get :index, params: { client_id: client.id }

      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      expect(json['metrics'].length).to eq(2)
    end

    it 'includes integration data in response' do
      get :index, params: { client_id: client.id }

      json = JSON.parse(response.body)
      metric = json['metrics'].first
      expect(metric['integration']).to include(
        'id' => integration.id,
        'provider' => 'google',
        'status' => 'active'
      )
    end

    it 'filters by source' do
      get :index, params: { client_id: client.id, source: 'google_analytics' }

      json = JSON.parse(response.body)
      expect(json['metrics'].length).to eq(1)
      expect(json['metrics'].first['source']).to eq('google_analytics')
    end

    it 'filters by metric_type' do
      get :index, params: { client_id: client.id, metric_type: 'sessions' }

      json = JSON.parse(response.body)
      expect(json['metrics'].length).to eq(1)
      expect(json['metrics'].first['metric_type']).to eq('sessions')
    end

    it 'filters by date range' do
      get :index, params: {
        client_id: client.id,
        start_date: 3.days.ago.to_date,
        end_date: 1.day.ago.to_date
      }

      json = JSON.parse(response.body)
      expect(json['metrics'].length).to eq(2)
    end

    it 'filters by start_date only' do
      get :index, params: {
        client_id: client.id,
        start_date: 1.day.ago.to_date
      }

      json = JSON.parse(response.body)
      expect(json['metrics'].length).to eq(1)
    end

    it 'filters by end_date only' do
      get :index, params: {
        client_id: client.id,
        end_date: 2.days.ago.to_date
      }

      json = JSON.parse(response.body)
      expect(json['metrics'].length).to eq(1)
    end

    it 'paginates results' do
      create_list(:metric, 15, client: client, integration: integration)

      get :index, params: { client_id: client.id, page: 1, per_page: 10 }

      json = JSON.parse(response.body)
      expect(json['metrics'].length).to eq(10)
      expect(json['meta']['page']).to eq(1)
      expect(json['meta']['per_page']).to eq(10)
      expect(json['meta']['total']).to eq(17) # 15 + 2 from let!
    end

    it 'limits per_page to 1000' do
      get :index, params: { client_id: client.id, per_page: 2000 }

      json = JSON.parse(response.body)
      expect(json['meta']['per_page']).to eq(1000)
    end

    it 'returns 404 when client not found' do
      get :index, params: { client_id: 999_999 }

      expect(response).to have_http_status(:not_found)
      json = JSON.parse(response.body)
      expect(json['error']).to eq('Client not found')
    end

    it 'orders metrics by date descending' do
      get :index, params: { client_id: client.id }

      json = JSON.parse(response.body)
      dates = json['metrics'].map { |m| Date.parse(m['date']) }
      expect(dates).to eq(dates.sort.reverse)
    end
  end

  describe 'GET #summary' do
    let!(:google_metrics) do
      [
        create(
          :metric,
          client: client,
          integration: integration,
          source: :google_analytics,
          metric_type: 'sessions',
          value: 100,
          date: 5.days.ago.to_date
        ),
        create(
          :metric,
          client: client,
          integration: integration,
          source: :google_analytics,
          metric_type: 'sessions',
          value: 150,
          date: 3.days.ago.to_date
        )
      ]
    end

    it 'returns summary data' do
      get :summary, params: { client_id: client.id }

      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      expect(json).to have_key('by_source')
      expect(json).to have_key('by_metric_type')
      expect(json).to have_key('date_range')
    end

    it 'calculates totals by source' do
      get :summary, params: { client_id: client.id }

      json = JSON.parse(response.body)
      google_summary = json['by_source']['google_analytics']
      expect(google_summary['total_records']).to eq(2)
      expect(google_summary['totals']['sessions']['sum']).to eq(250.0)
      expect(google_summary['totals']['sessions']['avg']).to eq(125.0)
      expect(google_summary['totals']['sessions']['count']).to eq(2)
    end

    it 'calculates totals by metric type' do
      get :summary, params: { client_id: client.id }

      json = JSON.parse(response.body)
      sessions_summary = json['by_metric_type']['sessions']
      expect(sessions_summary['sum']).to eq(250.0)
      expect(sessions_summary['avg']).to eq(125.0)
      expect(sessions_summary['count']).to eq(2)
    end

    it 'accepts custom date range' do
      get :summary, params: {
        client_id: client.id,
        start_date: 10.days.ago.to_date,
        end_date: Date.current
      }

      json = JSON.parse(response.body)
      expect(json['date_range']['start']).to eq(10.days.ago.to_date.iso8601)
      expect(json['date_range']['end']).to eq(Date.current.iso8601)
    end

    it 'defaults to last 30 days' do
      get :summary, params: { client_id: client.id }

      json = JSON.parse(response.body)
      expect(json['date_range']['start']).to eq(30.days.ago.to_date.iso8601)
      expect(json['date_range']['end']).to eq(Date.current.iso8601)
    end

    it 'returns 404 when client not found' do
      get :summary, params: { client_id: 999_999 }

      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'POST #sync' do
    context 'when syncing a specific integration' do
      it 'enqueues sync job for the integration' do
        expect {
          post :sync, params: {
            client_id: client.id,
            integration_id: integration.id
          }
        }.to have_enqueued_job(IntegrationSyncJob)
          .with(integration.id, hash_including(start_date: nil, end_date: nil))
      end

      it 'returns accepted status with message' do
        post :sync, params: {
          client_id: client.id,
          integration_id: integration.id
        }

        expect(response).to have_http_status(:accepted)
        json = JSON.parse(response.body)
        expect(json['message']).to include('Sync started')
        expect(json['status']).to eq('processing')
        expect(json['integration_id']).to eq(integration.id)
      end

      it 'passes date range to job' do
        expect {
          post :sync, params: {
            client_id: client.id,
            integration_id: integration.id,
            start_date: '2026-06-01',
            end_date: '2026-06-10'
          }
        }.to have_enqueued_job(IntegrationSyncJob)
          .with(
            integration.id,
            hash_including(
              start_date: '2026-06-01',
              end_date: '2026-06-10'
            )
          )
      end

      it 'returns 404 when integration not found' do
        post :sync, params: {
          client_id: client.id,
          integration_id: 999_999
        }

        expect(response).to have_http_status(:not_found)
      end
    end

    context 'when syncing all client integrations' do
      let!(:integration2) do
        create(
          :integration,
          client: client,
          provider: :meta,
          status: :active
        )
      end

      let!(:inactive_integration) do
        create(
          :integration,
          client: client,
          provider: :slack,
          status: :inactive
        )
      end

      it 'enqueues sync jobs for all active integrations' do
        expect {
          post :sync, params: { client_id: client.id }
        }.to have_enqueued_job(IntegrationSyncJob).exactly(2).times
      end

      it 'does not sync inactive integrations' do
        post :sync, params: { client_id: client.id }

        expect(IntegrationSyncJob).not_to have_been_enqueued
          .with(inactive_integration.id, anything)
      end

      it 'returns accepted status with count' do
        post :sync, params: { client_id: client.id }

        expect(response).to have_http_status(:accepted)
        json = JSON.parse(response.body)
        expect(json['message']).to include('2 integration(s)')
        expect(json['status']).to eq('processing')
      end
    end

    it 'returns 404 when client not found' do
      post :sync, params: { client_id: 999_999 }

      expect(response).to have_http_status(:not_found)
    end
  end
end
