class Material < ApplicationRecord
  belongs_to :client

  has_one_attached :file

  enum :material_type, {
    email: 0,
    csv: 1,
    xlsx: 2,
    audio: 3,
    transcript: 4,
    pdf: 5,
    txt: 6,
    docx: 7,
    note: 8,
    other: 99
  }, prefix: true

  validates :material_type, presence: true
  validates :content, presence: true, unless: :has_file?

  # Indexa el contenido en el vector store (RAG) cuando hay texto, y lo elimina
  # al destruir el material. Se ejecuta en background.
  after_commit :enqueue_embedding, on: %i[create update], if: :should_index?
  after_commit :remove_embedding, on: :destroy

  def should_index?
    content.present? && (saved_change_to_content? || saved_change_to_id?)
  end

  EXTENSION_TYPES = {
    '.pdf'  => :pdf,
    '.doc'  => :docx, '.docx' => :docx,
    '.xls'  => :xlsx, '.xlsx' => :xlsx,
    '.csv'  => :csv,
    '.txt'  => :txt,
    '.mp3'  => :audio, '.wav' => :audio, '.m4a' => :audio, '.ogg' => :audio, '.webm' => :audio,
  }.freeze

  def self.type_from_filename(filename)
    ext = File.extname(filename.to_s).downcase
    EXTENSION_TYPES[ext] || :other
  end

  def has_file?
    file.attached? || file_url.present?
  end

  # Estado del indexado vectorial (RAG): "pending" / "done" / "failed" / nil.
  def embedding_status
    metadata&.dig('embedding_status')
  end

  # Transcripción vinculada a este audio (creada por TranscriptionJob con
  # metadata.source_material_id apuntando a este material).
  def transcript
    return nil unless material_type_audio?

    client.materials
          .material_type_transcript
          .where("metadata ->> 'source_material_id' = ?", id.to_s)
          .first
  end

  def transcribed?
    transcript.present?
  end

  # Audio origen de esta transcripción.
  def source_audio
    return nil unless material_type_transcript?

    source_id = metadata&.dig('source_material_id')
    return nil unless source_id

    client.materials.find_by(id: source_id)
  end

  private

  def enqueue_embedding
    EmbeddingJob.perform_later(id)
  end

  def remove_embedding
    Embeddings::Client.new.delete_material(id)
  rescue Exception => e # rubocop:disable Lint/RescueException
    # Cleanup best-effort: nunca debe impedir borrar el material (incluye
    # errores de red/WebMock fuera de StandardError).
    Rails.logger.warn "Failed to remove embeddings for material #{id}: #{e.message}"
  end
end
