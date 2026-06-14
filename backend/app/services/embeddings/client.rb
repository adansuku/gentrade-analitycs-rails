# frozen_string_literal: true

module Embeddings
  # Cliente de embeddings + búsqueda vectorial sobre Qdrant (REST).
  # Genera vectores con OpenAI (text-embedding-3-small, 1536 dims) y opera la
  # colección de Qdrant para upsert/search/delete por material y cliente.
  class Client
    MODEL = ENV.fetch('EMBEDDING_MODEL', 'text-embedding-3-small')
    DIMENSION = 1536
    MAX_INPUT_CHARS = 8000

    def initialize(api_key: ENV['OPENAI_API_KEY'], qdrant_url: ENV['QDRANT_URL'], collection: ENV['QDRANT_COLLECTION'])
      @api_key = api_key
      @qdrant_url = (qdrant_url || 'http://qdrant:6333').chomp('/')
      @collection = collection || 'materials'
    end

    # ── Embeddings ─────────────────────────────────────────────────────────────

    def generate_embedding(text)
      response = openai.embeddings(
        parameters: { model: MODEL, input: text.to_s[0, MAX_INPUT_CHARS] }
      )
      response.dig('data', 0, 'embedding')
    end

    # Divide texto en chunks solapados (paridad con el origen: 500/50).
    def chunk_text(text, max_size: 500, overlap: 50)
      return [] if text.blank?
      return [text] if text.length <= max_size

      chunks = []
      start = 0
      while start < text.length
        chunks << text[start, max_size]
        start += max_size - overlap
      end
      chunks
    end

    # ── Qdrant ─────────────────────────────────────────────────────────────────

    def ensure_collection!
      return true if collection_exists?

      qdrant_put("/collections/#{@collection}", {
        vectors: { size: DIMENSION, distance: 'Cosine' }
      })
      create_payload_index('client_id')
      create_payload_index('material_id')
      true
    end

    def upsert_chunks(client_id:, material_id:, chunks:)
      return 0 if chunks.blank?

      ensure_collection!

      points = chunks.each_with_index.map do |chunk, i|
        {
          id: point_id(material_id, i),
          vector: generate_embedding(chunk),
          payload: { client_id: client_id, material_id: material_id, chunk_index: i, text: chunk }
        }
      end

      qdrant_put("/collections/#{@collection}/points", { points: points })
      points.size
    end

    def search(query_text, client_id:, top_k: 10)
      vector = generate_embedding(query_text)

      response = HTTParty.post(
        "#{@qdrant_url}/collections/#{@collection}/points/search",
        headers: qdrant_headers,
        body: {
          vector: vector,
          limit: top_k,
          filter: { must: [{ key: 'client_id', match: { value: client_id } }] },
          with_payload: true
        }.to_json
      )

      return [] unless response.success?

      (response.parsed_response['result'] || []).map do |r|
        payload = r['payload'] || {}
        {
          text: payload['text'],
          material_id: payload['material_id'],
          chunk_index: payload['chunk_index'],
          score: r['score']
        }
      end
    end

    def delete_material(material_id)
      return unless collection_exists?

      HTTParty.post(
        "#{@qdrant_url}/collections/#{@collection}/points/delete",
        headers: qdrant_headers,
        body: { filter: { must: [{ key: 'material_id', match: { value: material_id } }] } }.to_json
      )
    end

    private

    def openai
      @openai ||= OpenAI::Client.new(access_token: @api_key)
    end

    def collection_exists?
      response = HTTParty.get("#{@qdrant_url}/collections/#{@collection}", headers: qdrant_headers)
      response.success?
    rescue StandardError
      false
    end

    def create_payload_index(field)
      qdrant_put("/collections/#{@collection}/index", {
        field_name: field, field_schema: 'keyword'
      })
    end

    def qdrant_put(path, body)
      HTTParty.put("#{@qdrant_url}#{path}", headers: qdrant_headers, body: body.to_json)
    end

    def qdrant_headers
      headers = { 'Content-Type' => 'application/json' }
      headers['api-key'] = ENV['QDRANT_API_KEY'] if ENV['QDRANT_API_KEY'].present?
      headers
    end

    # ID numérico determinista a partir de material_id + chunk_index.
    def point_id(material_id, chunk_index)
      Digest::MD5.hexdigest("#{material_id}_#{chunk_index}")[0, 15].to_i(16)
    end
  end
end
