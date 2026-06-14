# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Api::V1::ClientsController, type: :controller do
  describe 'GET #index' do
    it 'returns active clients' do
      active_client = create(:client)
      deleted_client = create(:client, deleted_at: Time.current)

      get :index

      expect(response).to have_http_status(:ok)
      ids = JSON.parse(response.body)['clients'].map { |c| c['id'] }
      expect(ids).to include(active_client.id)
      expect(ids).not_to include(deleted_client.id)
    end

    it 'orders clients by most recently created first' do
      older = create(:client, created_at: 2.days.ago)
      newer = create(:client, created_at: 1.day.ago)

      get :index

      ids = JSON.parse(response.body)['clients'].map { |c| c['id'] }
      expect(ids.index(newer.id)).to be < ids.index(older.id)
    end

    it 'includes counts and metadata in the response' do
      client = create(:client)
      create_list(:material, 2, client: client)
      create(:proposal, client: client)

      get :index

      data = JSON.parse(response.body)['clients'].find { |c| c['id'] == client.id }
      expect(data['materials_count']).to eq(2)
      expect(data['proposals_count']).to eq(1)
      expect(data['name']).to eq(client.name)
      expect(data['email']).to eq(client.email)
    end
  end

  describe 'GET #show' do
    it 'returns the client with materials and proposals' do
      client = create(:client)
      material = create(:material, client: client)
      proposal = create(:proposal, client: client)

      get :show, params: { id: client.id }

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)['id']).to eq(client.id)
      expect(JSON.parse(response.body)['materials'].map { |m| m['id'] }).to include(material.id)
      expect(JSON.parse(response.body)['proposals'].map { |p| p['id'] }).to include(proposal.id)
    end

    it 'returns 404 when the client does not exist' do
      get :show, params: { id: 999_999 }

      expect(response).to have_http_status(:not_found)
      expect(JSON.parse(response.body)['error']).to eq('Client not found')
    end
  end

  describe 'POST #create' do
    let(:valid_attributes) do
      {
        name: 'Acme Corp',
        email: 'acme@example.com',
        industry: 'technology',
        description: 'A great client'
      }
    end

    it 'creates a new client' do
      expect {
        post :create, params: valid_attributes
      }.to change { Client.count }.by(1)

      expect(response).to have_http_status(:created)
      expect(JSON.parse(response.body)['name']).to eq('Acme Corp')
      expect(JSON.parse(response.body)['email']).to eq('acme@example.com')
    end

    it 'returns errors when invalid' do
      post :create, params: { name: 'Acme Corp' }

      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)['errors']).to be_present
    end

    it 'returns errors for a duplicate email' do
      create(:client, email: 'acme@example.com')

      post :create, params: valid_attributes

      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)['errors'].join).to include('Email')
    end
  end

  describe 'PATCH #update' do
    it 'updates the client' do
      client = create(:client, name: 'Old Name')

      patch :update, params: { id: client.id, name: 'New Name' }

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)['name']).to eq('New Name')
      expect(client.reload.name).to eq('New Name')
    end

    it 'returns errors when invalid' do
      client = create(:client)

      patch :update, params: { id: client.id, name: '' }

      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)['errors']).to be_present
    end

    it 'returns 404 when the client does not exist' do
      patch :update, params: { id: 999_999, name: 'New Name' }

      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'DELETE #destroy' do
    it 'soft deletes the client' do
      client = create(:client)

      delete :destroy, params: { id: client.id }

      expect(response).to have_http_status(:no_content)
      expect(client.reload.deleted_at).not_to be_nil
      expect(Client.active).not_to include(client)
    end

    it 'returns 404 when the client does not exist' do
      delete :destroy, params: { id: 999_999 }

      expect(response).to have_http_status(:not_found)
    end
  end
end
