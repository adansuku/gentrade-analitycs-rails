# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Api::V1::IntegrationsController, type: :controller do
  let(:client) { create(:client) }

  describe 'GET #slack_auth' do
    before do
      allow(ENV).to receive(:[]).and_call_original
      allow(ENV).to receive(:[]).with('SLACK_CLIENT_ID').and_return('test_client_id')
      allow(ENV).to receive(:[]).with('SLACK_REDIRECT_URI').and_return('http://localhost:3002/api/v1/integrations/slack/callback')
      allow(ENV).to receive(:fetch).with('SLACK_SCOPES', anything).and_return('chat:write,channels:read')
    end

    it 'returns Slack OAuth URL' do
      get :slack_auth, params: { client_id: client.id }

      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      expect(json['auth_url']).to include('slack.com/oauth/v2/authorize')
      expect(json['auth_url']).to include('client_id=test_client_id')
      expect(json['auth_url']).to include('scope=')
    end

    it 'includes state token in URL' do
      get :slack_auth, params: { client_id: client.id }

      json = JSON.parse(response.body)
      expect(json['auth_url']).to include('state=')
    end
  end

  describe 'GET #slack_callback' do
    let(:code) { 'test_auth_code' }
    let(:state_token) do
      JWT.encode(
        { client_id: client.id, timestamp: Time.current.to_i, nonce: SecureRandom.hex(16) },
        ENV['OAUTH_STATE_SECRET'],
        'HS256'
      )
    end

    before do
      allow(ENV).to receive(:[]).and_call_original
      allow(ENV).to receive(:[]).with('SLACK_CLIENT_ID').and_return('test_client_id')
      allow(ENV).to receive(:[]).with('SLACK_CLIENT_SECRET').and_return('test_secret')
      allow(ENV).to receive(:[]).with('SLACK_REDIRECT_URI').and_return('http://localhost:3002/callback')
      allow(ENV).to receive(:[]).with('FRONTEND_URL').and_return('http://localhost:5173')
    end

    context 'when OAuth is successful' do
      let(:slack_response) do
        {
          ok: true,
          access_token: 'xoxb-test-token',
          team: {
            id: 'T123456',
            name: 'Test Team'
          },
          bot_user_id: 'U123456',
          scope: 'chat:write,channels:read'
        }.to_json
      end

      before do
        stub_request(:post, 'https://slack.com/api/oauth.v2.access')
          .to_return(status: 200, body: slack_response)
      end

      it 'creates a Slack integration' do
        expect {
          get :slack_callback, params: { code: code, state: state_token }
        }.to change { Integration.count }.by(1)

        integration = Integration.last
        expect(integration.provider).to eq('slack')
        expect(integration.status).to eq('active')
        expect(integration.access_token).to eq('xoxb-test-token')
      end

      it 'stores team metadata' do
        get :slack_callback, params: { code: code, state: state_token }

        integration = Integration.last
        expect(integration.metadata['team_id']).to eq('T123456')
        expect(integration.metadata['team_name']).to eq('Test Team')
        expect(integration.metadata['bot_user_id']).to eq('U123456')
        expect(integration.metadata['scope']).to eq('chat:write,channels:read')
      end

      it 'redirects to frontend with success' do
        get :slack_callback, params: { code: code, state: state_token }

        expect(response).to redirect_to(
          "http://localhost:5173/clients/#{client.id}?integration=success"
        )
      end

      it 'updates existing integration if already exists' do
        existing = create(
          :integration,
          client: client,
          provider: :slack,
          access_token: 'old_token'
        )

        expect {
          get :slack_callback, params: { code: code, state: state_token }
        }.not_to change { Integration.count }

        existing.reload
        expect(existing.access_token).to eq('xoxb-test-token')
      end
    end

    context 'when state token is invalid' do
      it 'returns forbidden error' do
        get :slack_callback, params: { code: code, state: 'invalid_token' }

        expect(response).to have_http_status(:forbidden)
        json = JSON.parse(response.body)
        expect(json['error']).to eq('Invalid state token')
      end
    end

    context 'when Slack OAuth fails' do
      let(:slack_error_response) do
        {
          ok: false,
          error: 'invalid_code'
        }.to_json
      end

      before do
        stub_request(:post, 'https://slack.com/api/oauth.v2.access')
          .to_return(status: 200, body: slack_error_response)
      end

      it 'returns unprocessable entity' do
        get :slack_callback, params: { code: code, state: state_token }

        expect(response).to have_http_status(:unprocessable_entity)
        json = JSON.parse(response.body)
        expect(json['error']).to include('invalid_code')
      end
    end
  end

  describe 'GET #slack_channels' do
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

    before do
      allow(Integrations::SlackMessenger).to receive(:new).and_return(messenger)
    end

    context 'when listing channels is successful' do
      let(:channels_data) do
        [
          { id: 'C123', name: 'general', is_private: false, num_members: 10 },
          { id: 'C456', name: 'random', is_private: false, num_members: 5 }
        ]
      end

      before do
        allow(messenger).to receive(:list_channels)
          .and_return({ success: true, data: channels_data })
      end

      it 'returns list of channels' do
        get :slack_channels, params: { id: integration.id }

        expect(response).to have_http_status(:success)
        json = JSON.parse(response.body)
        expect(json['channels'].length).to eq(2)
        expect(json['channels'].first['name']).to eq('general')
      end
    end

    context 'when integration is not Slack' do
      before do
        integration.update(provider: :google)
      end

      it 'returns unprocessable entity error' do
        get :slack_channels, params: { id: integration.id }

        expect(response).to have_http_status(:unprocessable_entity)
        json = JSON.parse(response.body)
        expect(json['error']).to include('not a Slack integration')
      end
    end

    context 'when Slack API returns an error' do
      before do
        allow(messenger).to receive(:list_channels)
          .and_return({ success: false, error: 'missing_scope' })
      end

      it 'returns error response' do
        get :slack_channels, params: { id: integration.id }

        expect(response).to have_http_status(:unprocessable_entity)
        json = JSON.parse(response.body)
        expect(json['error']).to eq('missing_scope')
      end
    end
  end

  describe 'POST #slack_send_report' do
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

    context 'when sending report successfully' do
      it 'enqueues SlackReportJob with channel' do
        expect {
          post :slack_send_report, params: {
            id: integration.id,
            channel: 'C789012',
            report_type: 'daily_summary'
          }
        }.to have_enqueued_job(SlackReportJob)
          .with(
            integration.id,
            hash_including(
              report_type: 'daily_summary',
              channel: 'C789012'
            )
          )
      end

      it 'returns accepted status' do
        post :slack_send_report, params: {
          id: integration.id,
          channel: 'C789012',
          report_type: 'daily_summary'
        }

        expect(response).to have_http_status(:accepted)
        json = JSON.parse(response.body)
        expect(json['status']).to eq('processing')
        expect(json['message']).to include('queued')
      end

      it 'uses default channel if not provided' do
        expect {
          post :slack_send_report, params: {
            id: integration.id,
            report_type: 'daily_summary'
          }
        }.to have_enqueued_job(SlackReportJob)
          .with(
            integration.id,
            hash_including(
              channel: 'C123456'
            )
          )
      end

      it 'defaults to daily_summary report type' do
        expect {
          post :slack_send_report, params: {
            id: integration.id,
            channel: 'C789012'
          }
        }.to have_enqueued_job(SlackReportJob)
          .with(
            integration.id,
            hash_including(
              report_type: 'daily_summary'
            )
          )
      end

      it 'passes date range for metrics_report' do
        expect {
          post :slack_send_report, params: {
            id: integration.id,
            channel: 'C789012',
            report_type: 'metrics_report',
            start_date: '2026-06-01',
            end_date: '2026-06-10'
          }
        }.to have_enqueued_job(SlackReportJob)
          .with(
            integration.id,
            hash_including(
              report_type: 'metrics_report',
              start_date: '2026-06-01',
              end_date: '2026-06-10'
            )
          )
      end

      it 'passes period for comparison_report' do
        expect {
          post :slack_send_report, params: {
            id: integration.id,
            channel: 'C789012',
            report_type: 'comparison_report',
            period: 'month'
          }
        }.to have_enqueued_job(SlackReportJob)
          .with(
            integration.id,
            hash_including(
              report_type: 'comparison_report',
              period: 'month'
            )
          )
      end
    end

    context 'when integration is not Slack' do
      before do
        integration.update(provider: :google)
      end

      it 'returns unprocessable entity error' do
        post :slack_send_report, params: {
          id: integration.id,
          channel: 'C789012'
        }

        expect(response).to have_http_status(:unprocessable_entity)
        json = JSON.parse(response.body)
        expect(json['error']).to include('not a Slack integration')
      end
    end

    context 'when channel is not provided and no default exists' do
      before do
        integration.update(metadata: {})
      end

      it 'returns bad request error' do
        post :slack_send_report, params: {
          id: integration.id,
          report_type: 'daily_summary'
        }

        expect(response).to have_http_status(:bad_request)
        json = JSON.parse(response.body)
        expect(json['error']).to eq('Channel is required')
      end
    end
  end
end
