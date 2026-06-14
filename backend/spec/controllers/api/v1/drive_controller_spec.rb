# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Api::V1::DriveController, type: :controller do
  let(:user) { create(:user) }
  let(:client) { create(:client) }

  before { sign_in user }

  describe 'GET #status' do
    it 'reporta no conectado por defecto' do
      get :status
      expect(JSON.parse(response.body)['connected']).to be false
    end

    it 'reporta conectado cuando hay token' do
      user.update_columns(google_drive_token: 'tok')
      get :status
      expect(JSON.parse(response.body)['connected']).to be true
    end
  end

  describe 'GET #auth' do
    it 'devuelve la URL de autorización de Google con scope de Drive' do
      get :auth
      url = JSON.parse(response.body)['auth_url']
      expect(url).to include('accounts.google.com')
      expect(url).to include(CGI.escape('drive.readonly'))
    end
  end

  describe 'GET #files' do
    it 'devuelve los archivos del usuario' do
      drive = instance_double(GoogleDrive::Client)
      allow(GoogleDrive::Client).to receive(:new).with(user).and_return(drive)
      allow(drive).to receive(:list_files).and_return(files: [{ id: 'f1', name: 'a.pdf' }], next_page_token: nil)

      get :files
      body = JSON.parse(response.body)
      expect(response).to have_http_status(:ok)
      expect(body['files'].first['id']).to eq('f1')
    end

    it 'responde 401 si Drive no está conectado' do
      drive = instance_double(GoogleDrive::Client)
      allow(GoogleDrive::Client).to receive(:new).and_return(drive)
      allow(drive).to receive(:list_files).and_raise(GoogleDrive::Client::NotConnectedError.new('no'))

      get :files
      expect(response).to have_http_status(:unauthorized)
      expect(JSON.parse(response.body)['connected']).to be false
    end
  end

  describe 'POST #import' do
    it 'importa el archivo y devuelve el material' do
      importer = instance_double(GoogleDrive::Importer)
      material = create(:material, client: client, material_type: :pdf, content: 'x', title: 'Doc')
      allow(GoogleDrive::Importer).to receive(:new).with(user: user, client: client).and_return(importer)
      allow(importer).to receive(:import).with('file-1').and_return(material)

      post :import, params: { client_id: client.id, file_id: 'file-1' }
      expect(response).to have_http_status(:created)
      expect(JSON.parse(response.body)['material']['id']).to eq(material.id)
    end

    it 'responde 400 sin file_id' do
      post :import, params: { client_id: client.id }
      expect(response).to have_http_status(:bad_request)
    end
  end
end
