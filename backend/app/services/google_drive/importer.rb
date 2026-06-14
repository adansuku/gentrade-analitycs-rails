# frozen_string_literal: true

module GoogleDrive
  # Importa un archivo de Google Drive como material del cliente:
  # descarga el contenido, detecta el tipo, lo adjunta (Active Storage) y,
  # si es audio, encola la transcripción.
  class Importer
    def initialize(user:, client:)
      @user = user
      @client = client
      @drive = GoogleDrive::Client.new(user)
    end

    def import(file_id)
      downloaded = @drive.download_file(file_id)

      type = Material.type_from_filename(downloaded[:filename])
      content = extract_text(downloaded, type)

      material = @client.materials.new(
        material_type: type,
        title: File.basename(downloaded[:filename], '.*').humanize,
        content: content.presence || "Archivo de Drive: #{downloaded[:filename]}",
        metadata: {
          'source' => 'google_drive',
          'drive_file_id' => file_id,
          'original_filename' => downloaded[:filename],
          'content_type' => downloaded[:mime_type],
          'size' => downloaded[:size]
        }
      )

      material.file.attach(
        io: StringIO.new(downloaded[:content]),
        filename: downloaded[:filename],
        content_type: downloaded[:mime_type]
      )

      material.save!

      TranscriptionJob.perform_later(material.id) if material.material_type_audio?

      material
    end

    private

    def extract_text(downloaded, type)
      return downloaded[:content] if type == :txt || downloaded[:mime_type].to_s.start_with?('text/')

      nil
    end
  end
end
