# frozen_string_literal: true

require 'rails_helper'

RSpec.describe MaterialsController, type: :controller do
  let(:user) { create(:user) }
  let(:client) { create(:client) }

  before { sign_in user }

  describe 'GET #search (semántica)' do
    it 'devuelve [] si la query está vacía' do
      get :search, params: { client_id: client.id, q: '' }
      expect(JSON.parse(response.body)['results']).to eq([])
    end

    it 'busca en el vector store y devuelve materiales rankeados por score' do
      m1 = create(:material, client: client, material_type: :txt, content: 'producto premium de cuero')
      m2 = create(:material, client: client, material_type: :note, content: 'reunión sobre precios')

      embeddings = instance_double(Embeddings::Client)
      allow(Embeddings::Client).to receive(:new).and_return(embeddings)
      allow(embeddings).to receive(:search).with('cuero', client_id: client.id, top_k: 20).and_return([
        { text: 'producto premium de cuero', material_id: m1.id, chunk_index: 0, score: 0.95 },
        { text: 'otro fragmento', material_id: m1.id, chunk_index: 1, score: 0.80 },
        { text: 'reunión sobre precios', material_id: m2.id, chunk_index: 0, score: 0.40 }
      ])

      get :search, params: { client_id: client.id, q: 'cuero' }
      results = JSON.parse(response.body)['results']

      expect(results.size).to eq(2)             # agrupa por material
      expect(results.first['id']).to eq(m1.id)  # mejor score primero
      expect(results.first['score']).to eq(0.95)
      expect(results.last['id']).to eq(m2.id)
    end

    it 'ignora hits de materiales que ya no existen' do
      embeddings = instance_double(Embeddings::Client)
      allow(Embeddings::Client).to receive(:new).and_return(embeddings)
      allow(embeddings).to receive(:search).and_return([
        { text: 'x', material_id: 999_999, chunk_index: 0, score: 0.9 }
      ])

      get :search, params: { client_id: client.id, q: 'algo' }
      expect(JSON.parse(response.body)['results']).to eq([])
    end
  end
end
