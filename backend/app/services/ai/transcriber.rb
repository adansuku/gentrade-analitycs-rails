# frozen_string_literal: true

module AI
  # Transcribe audio usando OpenAI Whisper (paridad con el sistema original).
  # Whisper requiere la API de OpenAI directa (no OpenRouter), vía ENV['OPENAI_API_KEY'].
  class Transcriber
    MODEL = 'whisper-1'
    DEFAULT_LANGUAGE = 'es'

    def initialize(api_key: ENV['OPENAI_API_KEY'])
      @api_key = api_key
    end

    # `audio_io` debe responder a #read (File, StringIO, Tempfile…).
    def transcribe(audio_io, language: DEFAULT_LANGUAGE)
      return error('No OpenAI API key configured') if @api_key.to_s.empty?

      client = OpenAI::Client.new(access_token: @api_key)

      response = client.audio.transcribe(
        parameters: {
          model: MODEL,
          file: audio_io,
          language: language,
          response_format: 'verbose_json'
        }
      )

      {
        success: true,
        text: response['text'],
        language: response['language'],
        duration: response['duration'],
        segments: response['segments'] || []
      }
    rescue StandardError => e
      Rails.logger.warn "Whisper transcription failed: #{e.message}"
      error(e.message)
    end

    private

    def error(message)
      { success: false, error: message }
    end
  end
end
