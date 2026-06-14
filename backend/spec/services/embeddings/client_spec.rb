# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Embeddings::Client do
  subject(:client) { described_class.new(api_key: 'sk-test') }

  let(:openai) { instance_double(OpenAI::Client) }

  before do
    allow(OpenAI::Client).to receive(:new).and_return(openai)
  end

  describe '#generate_embedding' do
    it 'pide el embedding a OpenAI y devuelve el vector' do
      allow(openai).to receive(:embeddings).and_return(
        'data' => [{ 'embedding' => [0.1, 0.2, 0.3] }]
      )

      vector = client.generate_embedding('hola mundo')
      expect(vector).to eq([0.1, 0.2, 0.3])
    end

    it 'usa el modelo configurado y trunca a 8000 chars' do
      long = 'a' * 9000
      expect(openai).to receive(:embeddings).with(
        parameters: hash_including(model: described_class::MODEL, input: 'a' * 8000)
      ).and_return('data' => [{ 'embedding' => [0.0] }])

      client.generate_embedding(long)
    end
  end

  describe '#chunk_text' do
    it 'devuelve [] para texto vacío' do
      expect(client.chunk_text(nil)).to eq([])
      expect(client.chunk_text('')).to eq([])
    end

    it 'devuelve un solo chunk si el texto es corto' do
      expect(client.chunk_text('corto')).to eq(['corto'])
    end

    it 'divide en chunks solapados' do
      text = 'x' * 1200
      chunks = client.chunk_text(text, max_size: 500, overlap: 50)
      expect(chunks.size).to be >= 2
      expect(chunks.first.length).to eq(500)
    end
  end

  describe '#search (Qdrant REST)' do
    it 'genera el vector de la query y busca filtrando por client_id' do
      allow(openai).to receive(:embeddings).and_return('data' => [{ 'embedding' => [0.5] }])

      stub = instance_double(HTTParty::Response, success?: true, parsed_response: {
        'result' => [
          { 'payload' => { 'text' => 'fragmento', 'material_id' => 7, 'chunk_index' => 0 }, 'score' => 0.92 }
        ]
      })
      expect(HTTParty).to receive(:post).with(
        a_string_including('/points/search'), anything
      ).and_return(stub)

      results = client.search('consulta', client_id: 1, top_k: 5)
      expect(results.first).to include(text: 'fragmento', material_id: 7, score: 0.92)
    end
  end
end
