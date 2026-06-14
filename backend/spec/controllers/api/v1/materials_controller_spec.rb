# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Api::V1::MaterialsController, type: :controller do
  let(:client) { create(:client) }

  describe 'GET #index' do
    it 'returns materials for the client ordered by most recent first' do
      older = create(:material, client: client, created_at: 2.days.ago)
      newer = create(:material, client: client, created_at: 1.day.ago)

      get :index, params: { client_id: client.id }

      expect(response).to have_http_status(:ok)
      ids = JSON.parse(response.body)['materials'].map { |m| m['id'] }
      expect(ids).to eq([newer.id, older.id])
    end

    it 'returns 404 when the client does not exist' do
      get :index, params: { client_id: 999_999 }

      expect(response).to have_http_status(:not_found)
      expect(JSON.parse(response.body)['error']).to eq('Client not found')
    end
  end

  describe 'POST #create' do
    let(:valid_attributes) do
      {
        material: {
          material_type: 'note',
          content: 'Some important note',
          metadata: { source: 'manual' }
        }
      }
    end

    it 'creates a new material for the client' do
      expect {
        post :create, params: valid_attributes.merge(client_id: client.id)
      }.to change { client.materials.count }.by(1)

      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body['material_type']).to eq('note')
      expect(body['content']).to eq('Some important note')
      expect(body['client_id']).to eq(client.id)
    end

    it 'returns errors when invalid' do
      post :create, params: { client_id: client.id, material: { material_type: 'note', content: '' } }

      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)['errors']).to be_present
    end
  end

  describe 'POST #upload' do
    it 'creates a material from an uploaded file' do
      file = fixture_file_upload('spec/fixtures/files/sample.txt', 'text/plain')

      expect {
        post :upload, params: { client_id: client.id, file: file }
      }.to change { client.materials.count }.by(1)

      expect(response).to have_http_status(:created)
      material = JSON.parse(response.body)['material']
      expect(material['material_type']).to eq('txt')
      expect(material['content']).to include('Sample content')
      expect(material['metadata']['original_filename']).to eq('sample.txt')
    end

    it 'returns bad_request when no file is provided' do
      post :upload, params: { client_id: client.id }

      expect(response).to have_http_status(:bad_request)
      expect(JSON.parse(response.body)['error']).to eq('No file provided')
    end

    it 'encola la transcripción al subir un audio' do
      file = fixture_file_upload('spec/fixtures/files/sample.webm', 'audio/webm')

      expect {
        post :upload, params: { client_id: client.id, file: file }
      }.to have_enqueued_job(TranscriptionJob)

      expect(response).to have_http_status(:created)
      expect(JSON.parse(response.body)['material']['material_type']).to eq('audio')
    end

    it 'no encola transcripción para archivos que no son audio' do
      file = fixture_file_upload('spec/fixtures/files/sample.txt', 'text/plain')

      expect {
        post :upload, params: { client_id: client.id, file: file }
      }.not_to have_enqueued_job(TranscriptionJob)
    end
  end

  describe 'DELETE #destroy' do
    it 'deletes the material' do
      material = create(:material, client: client)

      expect {
        delete :destroy, params: { client_id: client.id, id: material.id }
      }.to change { client.materials.count }.by(-1)

      expect(response).to have_http_status(:no_content)
    end

    it 'returns 404 when the material does not exist' do
      delete :destroy, params: { client_id: client.id, id: 999_999 }

      expect(response).to have_http_status(:not_found)
      expect(JSON.parse(response.body)['error']).to eq('Material not found')
    end
  end
end
