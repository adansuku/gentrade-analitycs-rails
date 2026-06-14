# frozen_string_literal: true

require 'rails_helper'

RSpec.describe AI::Transcriber do
  let(:openai_client) { instance_double(OpenAI::Client) }
  let(:audio_client) { double }

  before do
    allow(OpenAI::Client).to receive(:new).and_return(openai_client)
    allow(openai_client).to receive(:audio).and_return(audio_client)
  end

  describe '#transcribe' do
    it 'transcribe audio con whisper-1 en español y devuelve el texto' do
      allow(audio_client).to receive(:transcribe).and_return(
        'text' => 'Hola, esto es una prueba.',
        'language' => 'spanish',
        'duration' => 12.5
      )

      result = described_class.new(api_key: 'sk-test').transcribe(StringIO.new('fake-audio'))

      expect(result[:success]).to be true
      expect(result[:text]).to eq('Hola, esto es una prueba.')
      expect(result[:language]).to eq('spanish')
      expect(result[:duration]).to eq(12.5)
    end

    it 'pasa el modelo whisper-1 y el idioma a la API' do
      expect(audio_client).to receive(:transcribe).with(
        hash_including(parameters: hash_including(model: 'whisper-1', language: 'es'))
      ).and_return('text' => 'ok')

      described_class.new(api_key: 'sk-test').transcribe(StringIO.new('x'))
    end

    it 'devuelve error si no hay API key' do
      result = described_class.new(api_key: nil).transcribe(StringIO.new('x'))
      expect(result[:success]).to be false
      expect(result[:error]).to match(/api key/i)
    end

    it 'captura excepciones de la API y devuelve error' do
      allow(audio_client).to receive(:transcribe).and_raise(StandardError.new('boom'))

      result = described_class.new(api_key: 'sk-test').transcribe(StringIO.new('x'))
      expect(result[:success]).to be false
      expect(result[:error]).to include('boom')
    end
  end
end
