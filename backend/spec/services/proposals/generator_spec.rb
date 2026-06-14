# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Proposals::Generator do
  let(:client) { create(:client, name: 'Test Client', industry: 'technology') }
  let(:materials) { create_list(:client_material, 2, client: client) }
  let(:ai_client) { instance_double(AI::OpenrouterClient) }
  let(:generator) { described_class.new(client, materials, ai_client: ai_client) }

  describe '#call' do
    context 'when materials are empty' do
      let(:generator) { described_class.new(client, [], ai_client: ai_client) }

      it 'returns error result' do
        result = generator.call

        expect(result[:success]).to be false
        expect(result[:error]).to eq('No materials provided')
      end
    end

    context 'when AI generation is successful' do
      let(:ai_response) do
        {
          success: true,
          content: '# Propuesta Comercial\n\nContenido de la propuesta...',
          usage: { total_tokens: 500 }
        }
      end

      before do
        allow(ai_client).to receive(:generate_completion).and_return(ai_response)
      end

      it 'returns success result with content' do
        result = generator.call

        expect(result[:success]).to be true
        expect(result[:content]).to include('Propuesta Comercial')
        expect(result[:usage][:total_tokens]).to eq(500)
      end

      it 'calls AI client with proper prompts' do
        expect(ai_client).to receive(:generate_completion).with(
          hash_including(
            prompt: include(client.name),
            system_prompt: include('propuestas comerciales'),
            max_tokens: 3000,
            temperature: 0.7
          )
        )

        generator.call
      end
    end

    context 'RAG: recuperación de contexto relevante' do
      let(:ai_response) { { success: true, content: '# Propuesta', usage: {} } }
      let(:embeddings) { instance_double(Embeddings::Client) }
      let(:generator) { described_class.new(client, materials, ai_client: ai_client, embeddings_client: embeddings) }

      before { allow(ai_client).to receive(:generate_completion).and_return(ai_response) }

      it 'usa los fragmentos recuperados cuando RAG devuelve resultados' do
        allow(embeddings).to receive(:search)
          .with(a_string_including(client.name), client_id: client.id, top_k: 15)
          .and_return([
            { text: 'fragmento relevante uno', material_id: 1, score: 0.9 },
            { text: 'fragmento relevante dos', material_id: 2, score: 0.8 }
          ])

        expect(ai_client).to receive(:generate_completion).with(
          hash_including(prompt: include('fragmento relevante uno'))
        ).and_return(ai_response)

        result = generator.call
        expect(result[:success]).to be true
        expect(result[:used_rag]).to be true
      end

      it 'hace fallback a materiales completos si RAG no devuelve nada' do
        allow(embeddings).to receive(:search).and_return([])

        result = generator.call
        expect(result[:success]).to be true
        expect(result[:used_rag]).to be false
      end

      it 'hace fallback a materiales completos si RAG falla' do
        allow(embeddings).to receive(:search).and_raise(StandardError.new('Qdrant down'))

        result = generator.call
        expect(result[:success]).to be true
        expect(result[:used_rag]).to be false
      end
    end

    context 'when AI generation fails' do
      let(:ai_response) do
        {
          success: false,
          error: 'API error'
        }
      end

      before do
        allow(ai_client).to receive(:generate_completion).and_return(ai_response)
      end

      it 'returns error result' do
        result = generator.call

        expect(result[:success]).to be false
        expect(result[:error]).to eq('API error')
      end
    end
  end
end
