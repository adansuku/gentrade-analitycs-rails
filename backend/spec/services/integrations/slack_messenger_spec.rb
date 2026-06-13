# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Integrations::SlackMessenger do
  let(:client) { create(:client) }
  let(:integration) do
    create(
      :integration,
      client: client,
      provider: :slack,
      status: :active,
      access_token: 'xoxb-test-token',
      metadata: {
        'team_id' => 'T123456',
        'team_name' => 'Test Team',
        'bot_user_id' => 'U123456'
      }
    )
  end

  let(:messenger) { described_class.new(integration) }

  describe '#send_message' do
    let(:channel) { 'C123456' }

    context 'when sending text message successfully' do
      let(:response_body) do
        {
          ok: true,
          channel: channel,
          ts: '1234567890.123456',
          message: {
            text: 'Test message',
            username: 'bot'
          }
        }.to_json
      end

      before do
        stub_request(:post, 'https://slack.com/api/chat.postMessage')
          .with(
            body: hash_including(
              channel: channel,
              text: 'Test message',
              token: 'xoxb-test-token'
            )
          )
          .to_return(status: 200, body: response_body)
      end

      it 'sends the message successfully' do
        result = messenger.send_message(channel: channel, text: 'Test message')
        expect(result[:success]).to be true
        expect(result[:data]['ok']).to be true
      end
    end

    context 'when sending blocks message successfully' do
      let(:blocks) do
        [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: 'Test Header'
            }
          }
        ]
      end

      let(:response_body) do
        {
          ok: true,
          channel: channel,
          ts: '1234567890.123456'
        }.to_json
      end

      before do
        stub_request(:post, 'https://slack.com/api/chat.postMessage')
          .with(
            body: hash_including(
              channel: channel,
              blocks: blocks.to_json,
              token: 'xoxb-test-token'
            )
          )
          .to_return(status: 200, body: response_body)
      end

      it 'sends the blocks message successfully' do
        result = messenger.send_message(channel: channel, blocks: blocks)
        expect(result[:success]).to be true
      end
    end

    context 'when integration is not active' do
      before { integration.update(status: :inactive) }

      it 'returns an error' do
        result = messenger.send_message(channel: channel, text: 'Test')
        expect(result[:success]).to be false
        expect(result[:error]).to eq('Integration is not active')
      end
    end

    context 'when integration is not Slack' do
      before { integration.update(provider: :google) }

      it 'returns an error' do
        result = messenger.send_message(channel: channel, text: 'Test')
        expect(result[:success]).to be false
        expect(result[:error]).to eq('Wrong provider')
      end
    end

    context 'when neither text nor blocks provided' do
      it 'returns an error' do
        result = messenger.send_message(channel: channel)
        expect(result[:success]).to be false
        expect(result[:error]).to eq('Either text or blocks must be provided')
      end
    end

    context 'when Slack API returns an error' do
      let(:response_body) do
        {
          ok: false,
          error: 'channel_not_found'
        }.to_json
      end

      before do
        stub_request(:post, 'https://slack.com/api/chat.postMessage')
          .to_return(status: 200, body: response_body)
      end

      it 'handles the Slack error' do
        result = messenger.send_message(channel: channel, text: 'Test')
        expect(result[:success]).to be false
        expect(result[:error]).to include('channel_not_found')
      end
    end

    context 'when Slack API returns invalid_auth error' do
      let(:response_body) do
        {
          ok: false,
          error: 'invalid_auth'
        }.to_json
      end

      before do
        stub_request(:post, 'https://slack.com/api/chat.postMessage')
          .to_return(status: 200, body: response_body)
      end

      it 'marks integration as expired' do
        expect {
          messenger.send_message(channel: channel, text: 'Test')
        }.to change { integration.reload.status }.to('expired')
      end

      it 'returns an error' do
        result = messenger.send_message(channel: channel, text: 'Test')
        expect(result[:success]).to be false
      end
    end

    context 'when HTTP request fails' do
      before do
        stub_request(:post, 'https://slack.com/api/chat.postMessage')
          .to_return(status: 500)
      end

      it 'returns an error' do
        result = messenger.send_message(channel: channel, text: 'Test')
        expect(result[:success]).to be false
        expect(result[:error]).to eq('Failed to send message to Slack')
      end
    end
  end

  describe '#list_channels' do
    context 'when listing channels successfully' do
      let(:response_body) do
        {
          ok: true,
          channels: [
            {
              id: 'C123456',
              name: 'general',
              is_private: false,
              num_members: 10
            },
            {
              id: 'C789012',
              name: 'random',
              is_private: false,
              num_members: 5
            }
          ]
        }.to_json
      end

      before do
        stub_request(:get, 'https://slack.com/api/conversations.list')
          .with(
            query: hash_including(
              token: 'xoxb-test-token',
              types: 'public_channel,private_channel',
              limit: '100'
            )
          )
          .to_return(status: 200, body: response_body)
      end

      it 'returns the list of channels' do
        result = messenger.list_channels
        expect(result[:success]).to be true
        expect(result[:data].length).to eq(2)
        expect(result[:data].first[:name]).to eq('general')
      end

      it 'formats channel data correctly' do
        result = messenger.list_channels
        channel = result[:data].first

        expect(channel).to include(
          id: 'C123456',
          name: 'general',
          is_private: false,
          num_members: 10
        )
      end
    end

    context 'when Slack API returns an error' do
      let(:response_body) do
        {
          ok: false,
          error: 'missing_scope'
        }.to_json
      end

      before do
        stub_request(:get, 'https://slack.com/api/conversations.list')
          .to_return(status: 200, body: response_body)
      end

      it 'returns an error' do
        result = messenger.list_channels
        expect(result[:success]).to be false
        expect(result[:error]).to include('missing_scope')
      end
    end

    context 'when HTTP request fails' do
      before do
        stub_request(:get, 'https://slack.com/api/conversations.list')
          .to_return(status: 500)
      end

      it 'returns an error' do
        result = messenger.list_channels
        expect(result[:success]).to be false
      end
    end
  end
end
