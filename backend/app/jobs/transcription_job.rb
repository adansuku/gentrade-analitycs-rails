# frozen_string_literal: true

# Transcribe un material de audio con Whisper y crea un material `transcript`
# asociado, en background. Idempotente: no duplica la transcripción de un audio.
class TranscriptionJob < ApplicationJob
  queue_as :default

  retry_on StandardError, wait: :polynomially_longer, attempts: 3

  def perform(material_id)
    audio = Material.find_by(id: material_id)
    return unless audio
    return unless audio.material_type_audio?
    return if transcript_exists?(audio)
    return unless audio.file.attached?

    result = audio.file.open do |file|
      AI::Transcriber.new.transcribe(file)
    end

    return unless result[:success] && result[:text].present?

    audio.client.materials.create!(
      material_type: :transcript,
      title: "Transcripción — #{audio.title}",
      content: result[:text],
      metadata: {
        'source' => 'audio',
        'source_material_id' => audio.id,
        'language' => result[:language],
        'duration' => result[:duration]
      }
    )

    broadcast_materials(audio.client)
  end

  private

  # Refresca en vivo la lista de materiales del cliente (badge "Transcrito"
  # y desaparición de la transcripción como fila suelta) sin recargar.
  def broadcast_materials(client)
    Turbo::StreamsChannel.broadcast_update_to(
      client, "materials",
      target: ActionView::RecordIdentifier.dom_id(client, :materials),
      partial: "clients/materials_list",
      locals: { client: client, materials: client.materials.order(created_at: :desc) }
    )
  rescue StandardError => e
    Rails.logger.warn "Failed to broadcast materials update: #{e.message}"
  end

  def transcript_exists?(audio)
    audio.client.materials
         .material_type_transcript
         .where("metadata ->> 'source_material_id' = ?", audio.id.to_s)
         .exists?
  end
end
