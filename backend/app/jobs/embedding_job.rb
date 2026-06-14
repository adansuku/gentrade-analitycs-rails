# frozen_string_literal: true

# Indexa el contenido de texto de un material en el vector store (Qdrant)
# para habilitar la búsqueda semántica y la recuperación en propuestas (RAG).
class EmbeddingJob < ApplicationJob
  queue_as :default

  retry_on StandardError, wait: :polynomially_longer, attempts: 3

  def perform(material_id)
    material = Material.find_by(id: material_id)
    return unless material
    return if material.content.blank?

    client = Embeddings::Client.new
    chunks = client.chunk_text(material.content)
    return if chunks.empty?

    client.upsert_chunks(
      client_id: material.client_id,
      material_id: material.id,
      chunks: chunks
    )
  end
end
