# frozen_string_literal: true

require 'rails_helper'

RSpec.describe EmbeddingJob, type: :job do
  let(:client) { create(:client) }
  let(:material) { create(:material, client: client, material_type: :txt, content: 'contenido del material para indexar') }

  let(:embeddings_client) { instance_double(Embeddings::Client) }

  before do
    allow(Embeddings::Client).to receive(:new).and_return(embeddings_client)
    allow(embeddings_client).to receive(:chunk_text).and_return(['contenido del material para indexar'])
    allow(embeddings_client).to receive(:upsert_chunks).and_return(1)
  end

  it 'indexa el contenido del material en el vector store' do
    expect(embeddings_client).to receive(:upsert_chunks).with(
      client_id: client.id, material_id: material.id, chunks: ['contenido del material para indexar']
    )
    EmbeddingJob.perform_now(material.id)
  end

  it 'no hace nada si el material no existe' do
    expect(embeddings_client).not_to receive(:upsert_chunks)
    expect { EmbeddingJob.perform_now(-1) }.not_to raise_error
  end

  it 'no indexa materiales sin contenido de texto' do
    empty = create(:material, client: client, material_type: :audio, content: '', file_url: '/x.mp3')
    expect(embeddings_client).not_to receive(:upsert_chunks)
    EmbeddingJob.perform_now(empty.id)
  end
end
