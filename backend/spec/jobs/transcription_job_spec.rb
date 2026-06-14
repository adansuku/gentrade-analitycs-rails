# frozen_string_literal: true

require 'rails_helper'

RSpec.describe TranscriptionJob, type: :job do
  let(:client) { create(:client) }
  let(:audio) do
    create(:material, client: client, material_type: :audio, content: 'Audio: grabacion.webm',
                      title: 'grabacion', metadata: { 'original_filename' => 'grabacion.webm' })
  end

  before do
    audio.file.attach(
      io: StringIO.new('fake-audio-bytes'),
      filename: 'grabacion.webm',
      content_type: 'audio/webm'
    )
  end

  context 'cuando la transcripción tiene éxito' do
    before do
      allow_any_instance_of(AI::Transcriber).to receive(:transcribe).and_return(
        success: true, text: 'Texto transcrito de la llamada.', language: 'spanish', duration: 8.0
      )
    end

    it 'crea un material transcript con el texto' do
      expect {
        described_class.perform_now(audio.id)
      }.to change { client.materials.material_type_transcript.count }.by(1)

      transcript = client.materials.material_type_transcript.last
      expect(transcript.content).to eq('Texto transcrito de la llamada.')
      expect(transcript.metadata['source']).to eq('audio')
      expect(transcript.metadata['source_material_id']).to eq(audio.id)
    end

    it 'es idempotente: no duplica si ya existe la transcripción del audio' do
      described_class.perform_now(audio.id)
      expect {
        described_class.perform_now(audio.id)
      }.not_to change { client.materials.material_type_transcript.count }
    end
  end

  context 'cuando la transcripción falla' do
    before do
      allow_any_instance_of(AI::Transcriber).to receive(:transcribe).and_return(
        success: false, error: 'No OpenAI API key configured'
      )
    end

    it 'no crea material transcript' do
      expect {
        described_class.perform_now(audio.id)
      }.not_to change { Material.material_type_transcript.count }
    end
  end

  context 'cuando el material no es audio o no existe' do
    it 'no hace nada si el material no existe' do
      expect { described_class.perform_now(-1) }.not_to raise_error
    end

    it 'no transcribe materiales que no son audio' do
      note = create(:material, client: client, material_type: :note, content: 'una nota')
      expect_any_instance_of(AI::Transcriber).not_to receive(:transcribe)
      described_class.perform_now(note.id)
    end
  end
end
