# frozen_string_literal: true

require 'rails_helper'

RSpec.describe AI::OpenrouterClient do
  let(:api_key) { 'test-api-key' }
  let(:model) { 'anthropic/claude-3-haiku' }
  let(:client) { described_class.new(api_key: api_key, model: model) }

  describe '#initialize' do
    it 'sets the API key' do
      expect(client.instance_variable_get(:@api_key)).to eq(api_key)
    end

    it 'sets the model' do
      expect(client.instance_variable_get(:@model)).to eq(model)
    end

    it 'uses ENV variables as defaults' do
      allow(ENV).to receive(:[]).and_call_original
      allow(ENV).to receive(:[]).with('OPENROUTER_API_KEY').and_return('env-key')
      allow(ENV).to receive(:fetch).and_call_original
      allow(ENV).to receive(:fetch).with('LLM_MODEL', 'anthropic/claude-3.5-sonnet').and_return('env-model')

      default_client = described_class.new

      expect(default_client.instance_variable_get(:@api_key)).to eq('env-key')
      expect(default_client.instance_variable_get(:@model)).to eq('env-model')
    end
  end

  describe '#chat' do
    let(:messages) { [{ role: 'user', content: 'Hello' }] }

    context 'when API call is successful' do
      before do
        stub_request(:post, "#{described_class::BASE_URL}/chat/completions")
          .to_return(
            status: 200,
            body: {
              choices: [{ message: { content: 'Hi there!' } }],
              usage: { total_tokens: 10 }
            }.to_json,
            headers: { 'Content-Type' => 'application/json' }
          )
      end

      it 'returns success response' do
        result = client.chat(messages: messages)

        expect(result[:success]).to be true
        expect(result[:content]).to eq('Hi there!')
        expect(result[:usage]).to eq({ total_tokens: 10 })
      end
    end

    context 'when API call fails' do
      before do
        stub_request(:post, "#{described_class::BASE_URL}/chat/completions")
          .to_return(status: 500, body: 'Internal Server Error')
      end

      it 'returns error response' do
        result = client.chat(messages: messages)

        expect(result[:success]).to be false
        expect(result[:error]).to be_present
      end
    end
  end

  describe '#generate_completion' do
    let(:prompt) { 'Write a story' }
    let(:system_prompt) { 'You are a storyteller' }

    it 'calls chat with properly formatted messages' do
      expect(client).to receive(:chat).with(
        messages: [
          { role: 'system', content: system_prompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.7
      )

      client.generate_completion(
        prompt: prompt,
        system_prompt: system_prompt,
        max_tokens: 2000,
        temperature: 0.7
      )
    end
  end
end
