# frozen_string_literal: true

require 'rails_helper'

RSpec.describe GoogleDrive::Importer do
  let(:user) { create(:user) }
  let(:client) { create(:client) }
  let(:drive_client) { instance_double(GoogleDrive::Client) }

  before do
    allow(GoogleDrive::Client).to receive(:new).with(user).and_return(drive_client)
  end

  describe '#import' do
    it 'descarga el archivo y crea un material con el tipo detectado' do
      allow(drive_client).to receive(:download_file).with('file-1').and_return(
        filename: 'informe.pdf', mime_type: 'application/pdf', size: 2048, content: '%PDF-1.4 bytes'
      )

      expect {
        described_class.new(user: user, client: client).import('file-1')
      }.to change { client.materials.count }.by(1)

      material = client.materials.last
      expect(material.material_type).to eq('pdf')
      expect(material.title).to eq('Informe')
      expect(material.metadata['source']).to eq('google_drive')
      expect(material.metadata['drive_file_id']).to eq('file-1')
      expect(material.file).to be_attached
    end

    it 'extrae texto de archivos de texto' do
      allow(drive_client).to receive(:download_file).with('file-2').and_return(
        filename: 'notas.txt', mime_type: 'text/plain', size: 10, content: 'contenido de prueba'
      )

      described_class.new(user: user, client: client).import('file-2')
      expect(client.materials.last.content).to eq('contenido de prueba')
    end

    it 'encola la transcripción para audios importados' do
      allow(drive_client).to receive(:download_file).with('file-3').and_return(
        filename: 'llamada.mp3', mime_type: 'audio/mpeg', size: 5000, content: 'audio-bytes'
      )

      expect {
        described_class.new(user: user, client: client).import('file-3')
      }.to have_enqueued_job(TranscriptionJob)
    end

    it 'devuelve el material creado' do
      allow(drive_client).to receive(:download_file).and_return(
        filename: 'doc.pdf', mime_type: 'application/pdf', size: 1, content: 'x'
      )
      result = described_class.new(user: user, client: client).import('file-4')
      expect(result).to be_a(Material)
      expect(result).to be_persisted
    end
  end
end
