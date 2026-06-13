# frozen_string_literal: true

module Api
  module V1
    class IntegrationsController < ApplicationController
      before_action :set_client, only: [:index, :create, :destroy]
      before_action :set_integration, only: [:show, :destroy]

      # GET /api/v1/clients/:client_id/integrations
      def index
        @integrations = @client.integrations.includes(:client)

        render json: {
          integrations: @integrations.map { |integration| integration_json(integration) }
        }
      end

      # GET /api/v1/integrations/:id
      def show
        render json: integration_json_with_details(@integration)
      end

      # POST /api/v1/clients/:client_id/integrations
      def create
        provider = params[:provider]

        # Check if integration already exists
        existing = @client.integrations.find_by(provider: provider)
        if existing
          return render json: { error: 'Integration already exists for this provider' },
                       status: :unprocessable_entity
        end

        @integration = @client.integrations.new(integration_params)

        if @integration.save
          render json: integration_json_with_details(@integration), status: :created
        else
          render json: { errors: @integration.errors.full_messages },
                status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/clients/:client_id/integrations/:id
      def destroy
        @integration.destroy
        head :no_content
      end

      # GET /api/v1/integrations/:id/slack/channels
      def slack_channels
        @integration = Integration.find(params[:id])

        unless @integration.provider_slack?
          return render json: { error: 'Integration is not a Slack integration' },
                       status: :unprocessable_entity
        end

        messenger = Integrations::SlackMessenger.new(@integration)
        result = messenger.list_channels

        if result[:success]
          render json: { channels: result[:data] }
        else
          render json: { error: result[:error] }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/integrations/:id/slack/send_report
      def slack_send_report
        @integration = Integration.find(params[:id])

        unless @integration.provider_slack?
          return render json: { error: 'Integration is not a Slack integration' },
                       status: :unprocessable_entity
        end

        channel = params[:channel] || @integration.metadata['default_channel']
        report_type = params[:report_type] || 'daily_summary'

        unless channel
          return render json: { error: 'Channel is required' }, status: :bad_request
        end

        # Enqueue the job
        SlackReportJob.perform_later(
          @integration.id,
          report_type: report_type,
          channel: channel,
          start_date: params[:start_date],
          end_date: params[:end_date],
          period: params[:period]
        )

        render json: {
          message: "Report #{report_type} queued for sending to channel #{channel}",
          status: 'processing'
        }, status: :accepted
      end

      # GET /api/v1/integrations/google/auth
      def google_auth
        redirect_uri = ENV['GOOGLE_INTEGRATIONS_REDIRECT_URI']
        client_id = ENV['GOOGLE_CLIENT_ID']

        scopes = [
          'https://www.googleapis.com/auth/analytics.readonly',
          'https://www.googleapis.com/auth/adwords'
        ].join(' ')

        auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" \
                   "client_id=#{client_id}&" \
                   "redirect_uri=#{CGI.escape(redirect_uri)}&" \
                   "response_type=code&" \
                   "scope=#{CGI.escape(scopes)}&" \
                   "access_type=offline&" \
                   "prompt=consent&" \
                   "state=#{generate_state_token}"

        render json: { auth_url: auth_url }
      end

      # GET /api/v1/integrations/google/callback
      def google_callback
        code = params[:code]
        state = params[:state]

        # Verify state token
        unless verify_state_token(state)
          return render json: { error: 'Invalid state token' }, status: :forbidden
        end

        # Exchange code for tokens
        token_response = exchange_google_code(code)

        if token_response[:error]
          return render json: { error: token_response[:error] },
                       status: :unprocessable_entity
        end

        # Get client_id from state
        client_id = decode_state_token(state)[:client_id]
        client = Client.find(client_id)

        # Create or update integration
        integration = client.integrations.find_or_initialize_by(provider: :google)
        integration.assign_attributes(
          access_token: token_response[:access_token],
          refresh_token: token_response[:refresh_token],
          expires_at: token_response[:expires_at],
          status: :active
        )

        if integration.save
          redirect_to "#{ENV['FRONTEND_URL']}/clients/#{client_id}?integration=success"
        else
          redirect_to "#{ENV['FRONTEND_URL']}/clients/#{client_id}?integration=error"
        end
      end

      # GET /api/v1/integrations/meta/auth
      def meta_auth
        redirect_uri = ENV['META_REDIRECT_URI']
        app_id = ENV['META_APP_ID']

        scopes = [
          'ads_read',
          'read_insights'
        ].join(',')

        auth_url = "https://www.facebook.com/v18.0/dialog/oauth?" \
                   "client_id=#{app_id}&" \
                   "redirect_uri=#{CGI.escape(redirect_uri)}&" \
                   "scope=#{CGI.escape(scopes)}&" \
                   "state=#{generate_state_token}"

        render json: { auth_url: auth_url }
      end

      # GET /api/v1/integrations/meta/callback
      def meta_callback
        code = params[:code]
        state = params[:state]

        unless verify_state_token(state)
          return render json: { error: 'Invalid state token' }, status: :forbidden
        end

        token_response = exchange_meta_code(code)

        if token_response[:error]
          return render json: { error: token_response[:error] },
                       status: :unprocessable_entity
        end

        client_id = decode_state_token(state)[:client_id]
        client = Client.find(client_id)

        integration = client.integrations.find_or_initialize_by(provider: :meta)
        integration.assign_attributes(
          access_token: token_response[:access_token],
          expires_at: token_response[:expires_at],
          status: :active
        )

        if integration.save
          redirect_to "#{ENV['FRONTEND_URL']}/clients/#{client_id}?integration=success"
        else
          redirect_to "#{ENV['FRONTEND_URL']}/clients/#{client_id}?integration=error"
        end
      end

      # GET /api/v1/integrations/slack/auth
      def slack_auth
        redirect_uri = ENV['SLACK_REDIRECT_URI']
        client_id = ENV['SLACK_CLIENT_ID']
        scopes = ENV.fetch('SLACK_SCOPES', 'chat:write,channels:read,chat:write.public')

        auth_url = "https://slack.com/oauth/v2/authorize?" \
                   "client_id=#{client_id}&" \
                   "redirect_uri=#{CGI.escape(redirect_uri)}&" \
                   "scope=#{CGI.escape(scopes)}&" \
                   "state=#{generate_state_token}"

        render json: { auth_url: auth_url }
      end

      # GET /api/v1/integrations/slack/callback
      def slack_callback
        code = params[:code]
        state = params[:state]

        unless verify_state_token(state)
          return render json: { error: 'Invalid state token' }, status: :forbidden
        end

        token_response = exchange_slack_code(code)

        if token_response[:error]
          return render json: { error: token_response[:error] },
                       status: :unprocessable_entity
        end

        client_id = decode_state_token(state)[:client_id]
        client = Client.find(client_id)

        integration = client.integrations.find_or_initialize_by(provider: :slack)
        integration.assign_attributes(
          access_token: token_response[:access_token],
          status: :active,
          metadata: {
            team_id: token_response[:team_id],
            team_name: token_response[:team_name],
            bot_user_id: token_response[:bot_user_id],
            scope: token_response[:scope]
          }
        )

        if integration.save
          redirect_to "#{ENV['FRONTEND_URL']}/clients/#{client_id}?integration=success"
        else
          redirect_to "#{ENV['FRONTEND_URL']}/clients/#{client_id}?integration=error"
        end
      end

      private

      def set_client
        @client = Client.find(params[:client_id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Client not found' }, status: :not_found
      end

      def set_integration
        @integration = Integration.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Integration not found' }, status: :not_found
      end

      def integration_params
        params.require(:integration).permit(
          :provider,
          :access_token,
          :refresh_token,
          :expires_at,
          :status,
          metadata: {}
        )
      end

      def integration_json(integration)
        {
          id: integration.id,
          client_id: integration.client_id,
          provider: integration.provider,
          provider_name: integration.provider_name,
          status: integration.status,
          expired: integration.expired?,
          expires_at: integration.expires_at&.iso8601,
          created_at: integration.created_at.iso8601,
          updated_at: integration.updated_at.iso8601
        }
      end

      def integration_json_with_details(integration)
        integration_json(integration).merge(
          access_token: integration.masked_access_token,
          metadata: integration.metadata
        )
      end

      def generate_state_token
        payload = {
          client_id: params[:client_id],
          timestamp: Time.current.to_i,
          nonce: SecureRandom.hex(16)
        }

        JWT.encode(payload, ENV['OAUTH_STATE_SECRET'], 'HS256')
      end

      def verify_state_token(token)
        decode_state_token(token)
        true
      rescue JWT::DecodeError, JWT::ExpiredSignature
        false
      end

      def decode_state_token(token)
        decoded = JWT.decode(token, ENV['OAUTH_STATE_SECRET'], true, algorithm: 'HS256')
        decoded.first.symbolize_keys
      end

      def exchange_google_code(code)
        redirect_uri = ENV['GOOGLE_INTEGRATIONS_REDIRECT_URI']

        response = HTTP.post('https://oauth2.googleapis.com/token', form: {
          code: code,
          client_id: ENV['GOOGLE_CLIENT_ID'],
          client_secret: ENV['GOOGLE_CLIENT_SECRET'],
          redirect_uri: redirect_uri,
          grant_type: 'authorization_code'
        })

        if response.status.success?
          data = JSON.parse(response.body)
          {
            access_token: data['access_token'],
            refresh_token: data['refresh_token'],
            expires_at: data['expires_in'].seconds.from_now
          }
        else
          { error: 'Failed to exchange code for token' }
        end
      rescue StandardError => e
        { error: e.message }
      end

      def exchange_meta_code(code)
        redirect_uri = ENV['META_REDIRECT_URI']

        response = HTTP.get('https://graph.facebook.com/v18.0/oauth/access_token', params: {
          client_id: ENV['META_APP_ID'],
          client_secret: ENV['META_APP_SECRET'],
          redirect_uri: redirect_uri,
          code: code
        })

        if response.status.success?
          data = JSON.parse(response.body)
          {
            access_token: data['access_token'],
            expires_at: data['expires_in']&.seconds&.from_now
          }
        else
          { error: 'Failed to exchange code for token' }
        end
      rescue StandardError => e
        { error: e.message }
      end

      def exchange_slack_code(code)
        redirect_uri = ENV['SLACK_REDIRECT_URI']

        response = HTTP.post('https://slack.com/api/oauth.v2.access', form: {
          client_id: ENV['SLACK_CLIENT_ID'],
          client_secret: ENV['SLACK_CLIENT_SECRET'],
          code: code,
          redirect_uri: redirect_uri
        })

        if response.status.success?
          data = JSON.parse(response.body)

          if data['ok']
            {
              access_token: data['access_token'],
              team_id: data['team']['id'],
              team_name: data['team']['name'],
              bot_user_id: data['bot_user_id'],
              scope: data['scope']
            }
          else
            { error: data['error'] || 'Slack OAuth failed' }
          end
        else
          { error: 'Failed to exchange code for token' }
        end
      rescue StandardError => e
        { error: e.message }
      end
    end
  end
end
