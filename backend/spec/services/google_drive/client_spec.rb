# frozen_string_literal: true

require 'rails_helper'

RSpec.describe GoogleDrive::Client do
  let(:user) do
    create(:user).tap do |u|
      u.update_columns(
        google_drive_token: 'access-token',
        google_drive_refresh_token: 'refresh-token',
        google_drive_token_expires_at: 1.hour.from_now
      )
    end
  end

  let(:drive_service) { instance_double(Google::Apis::DriveV3::DriveService) }

  before do
    allow(Google::Apis::DriveV3::DriveService).to receive(:new).and_return(drive_service)
    allow(drive_service).to receive(:authorization=)
  end

  describe '#list_files' do
    let(:file1) do
      double(id: 'f1', name: 'informe.pdf', mime_type: 'application/pdf',
             size: 2048, modified_time: Time.current)
    end
    let(:folder) do
      double(id: 'd1', name: 'Carpeta', mime_type: 'application/vnd.google-apps.folder',
             size: nil, modified_time: Time.current)
    end
    let(:response) { double(files: [folder, file1], next_page_token: 'tok123') }

    it 'lista archivos mapeando los campos y marcando carpetas' do
      allow(drive_service).to receive(:list_files).and_return(response)

      result = described_class.new(user).list_files

      expect(result[:files].size).to eq(2)
      expect(result[:files].first).to include(id: 'd1', is_folder: true)
      expect(result[:files].last).to include(id: 'f1', name: 'informe.pdf', size: 2048, is_folder: false)
      expect(result[:next_page_token]).to eq('tok123')
    end

    it 'filtra por query de nombre cuando se pasa' do
      expect(drive_service).to receive(:list_files)
        .with(hash_including(q: a_string_including("name contains 'informe'")))
        .and_return(double(files: [], next_page_token: nil))

      described_class.new(user).list_files(query: 'informe')
    end

    it 'excluye archivos en la papelera' do
      expect(drive_service).to receive(:list_files)
        .with(hash_including(q: a_string_including('trashed = false')))
        .and_return(double(files: [], next_page_token: nil))

      described_class.new(user).list_files
    end
  end

  describe '#download_file' do
    it 'descarga el contenido binario y devuelve metadata + bytes' do
      meta = double(id: 'f1', name: 'audio.mp3', mime_type: 'audio/mpeg', size: 1234)
      allow(drive_service).to receive(:get_file).with('f1', anything).and_return(meta)
      allow(drive_service).to receive(:get_file).with('f1', hash_including(download_dest: anything)) do |_id, opts|
        opts[:download_dest].write('binary-bytes')
        meta
      end

      result = described_class.new(user).download_file('f1')

      expect(result[:filename]).to eq('audio.mp3')
      expect(result[:mime_type]).to eq('audio/mpeg')
      expect(result[:content]).to eq('binary-bytes')
    end
  end

  describe 'sin conexión a Drive' do
    it 'lanza error si el usuario no tiene token' do
      user.update_columns(google_drive_token: nil, google_drive_refresh_token: nil)
      expect { described_class.new(user).list_files }.to raise_error(GoogleDrive::Client::NotConnectedError)
    end
  end
end
