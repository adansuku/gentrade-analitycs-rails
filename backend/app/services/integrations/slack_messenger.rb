# frozen_string_literal: true

module Integrations
  class SlackMessenger
    def initialize(integration)
      @integration = integration
      @client = @integration.client
    end

    def send_message(channel:, text: nil, blocks: nil)
      return error_result('Integration is not active') unless @integration.active?
      return error_result('Wrong provider') unless @integration.provider_slack?

      begin
        payload = {
          channel: channel,
          token: @integration.access_token
        }

        if blocks
          payload[:blocks] = blocks.to_json
        elsif text
          payload[:text] = text
        else
          return error_result('Either text or blocks must be provided')
        end

        response = HTTP.post(
          'https://slack.com/api/chat.postMessage',
          json: payload
        )

        if response.status.success?
          data = JSON.parse(response.body)

          if data['ok']
            success_result(data)
          else
            handle_slack_error(data['error'])
          end
        else
          error_result('Failed to send message to Slack')
        end
      rescue StandardError => e
        error_result("Failed to send Slack message: #{e.message}")
      end
    end

    def list_channels
      return error_result('Integration is not active') unless @integration.active?
      return error_result('Wrong provider') unless @integration.provider_slack?

      begin
        response = HTTP.get(
          'https://slack.com/api/conversations.list',
          params: {
            token: @integration.access_token,
            types: 'public_channel,private_channel',
            limit: 100
          }
        )

        if response.status.success?
          data = JSON.parse(response.body)

          if data['ok']
            channels = data['channels'].map do |channel|
              {
                id: channel['id'],
                name: channel['name'],
                is_private: channel['is_private'],
                num_members: channel['num_members']
              }
            end
            success_result(channels)
          else
            handle_slack_error(data['error'])
          end
        else
          error_result('Failed to fetch channels from Slack')
        end
      rescue StandardError => e
        error_result("Failed to fetch Slack channels: #{e.message}")
      end
    end

    private

    def handle_slack_error(error_code)
      case error_code
      when 'not_authed', 'invalid_auth', 'account_inactive', 'token_revoked'
        @integration.update(status: :expired)
        error_result('Slack authentication failed. Please reconnect.')
      when 'channel_not_found'
        error_result('Channel not found')
      when 'is_archived'
        error_result('Channel is archived')
      when 'msg_too_long'
        error_result('Message is too long')
      else
        error_result("Slack API error: #{error_code}")
      end
    end

    def success_result(data)
      {
        success: true,
        data: data
      }
    end

    def error_result(message)
      {
        success: false,
        error: message
      }
    end
  end
end
