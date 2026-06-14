# frozen_string_literal: true

require 'google/apis/drive_v3'

module GoogleDrive
  # Wrapper de la Google Drive API (v3) que opera con los tokens del usuario.
  # Lista y descarga archivos para importarlos como materiales.
  class Client
    class NotConnectedError < StandardError; end

    # MIME types soportados para importación (paridad con el sistema original).
    SUPPORTED_MIME_TYPES = [
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4', 'audio/ogg',
      'application/vnd.google-apps.folder',
      'application/vnd.google-apps.document',
      'application/vnd.google-apps.spreadsheet'
    ].freeze

    FOLDER_MIME = 'application/vnd.google-apps.folder'

    # Export de Google Docs/Sheets a formatos Office descargables.
    GOOGLE_EXPORTS = {
      'application/vnd.google-apps.document' =>
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.google-apps.spreadsheet' =>
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }.freeze

    def initialize(user)
      @user = user
    end

    def list_files(folder_id: nil, query: nil, page_size: 20, page_token: nil)
      response = service.list_files(
        q: build_query(folder_id, query),
        page_size: page_size,
        page_token: page_token,
        fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, iconLink)',
        order_by: 'folder,modifiedTime desc',
        supports_all_drives: true,
        include_items_from_all_drives: true
      )

      {
        files: (response.files || []).map { |f| map_file(f) },
        next_page_token: response.next_page_token
      }
    end

    # Descarga un archivo. Para Google Docs/Sheets usa export; el resto, media.
    # Devuelve { filename:, mime_type:, size:, content: (String binario) }.
    def download_file(file_id)
      meta = service.get_file(file_id, fields: 'id, name, mimeType, size', supports_all_drives: true)
      buffer = StringIO.new
      buffer.set_encoding(Encoding::BINARY)

      export_mime = GOOGLE_EXPORTS[meta.mime_type]
      filename = meta.name

      if export_mime
        service.export_file(file_id, export_mime, download_dest: buffer)
        filename = ensure_extension(filename, export_mime)
        final_mime = export_mime
      else
        service.get_file(file_id, download_dest: buffer, supports_all_drives: true)
        final_mime = meta.mime_type
      end

      {
        filename: filename,
        mime_type: final_mime,
        size: meta.size,
        content: buffer.string
      }
    end

    private

    def service
      raise NotConnectedError, 'El usuario no tiene Google Drive conectado' unless @user.google_drive_connected?

      @service ||= begin
        svc = Google::Apis::DriveV3::DriveService.new
        svc.authorization = @user.google_drive_token
        svc
      end
    end

    def build_query(folder_id, query)
      parts = ['trashed = false']
      parts << "'#{folder_id}' in parents" if folder_id.present?
      parts << "name contains '#{query.gsub("'", "\\\\'")}'" if query.present?
      parts << "(#{SUPPORTED_MIME_TYPES.map { |m| "mimeType = '#{m}'" }.join(' or ')})"
      parts.join(' and ')
    end

    def map_file(file)
      {
        id: file.id,
        name: file.name,
        mime_type: file.mime_type,
        size: file.size ? file.size.to_i : nil,
        modified_time: file.modified_time,
        is_folder: file.mime_type == FOLDER_MIME,
        is_google_doc: file.mime_type.to_s.start_with?('application/vnd.google-apps.')
      }
    end

    def ensure_extension(name, mime)
      ext = mime.include?('spreadsheet') ? '.xlsx' : '.docx'
      name.end_with?(ext) ? name : "#{name}#{ext}"
    end
  end
end
