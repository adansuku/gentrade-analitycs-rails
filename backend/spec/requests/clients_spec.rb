require 'rails_helper'

RSpec.describe 'Clients', type: :request do
  let(:user) { create(:user) }

  before { sign_in user }

  describe 'GET /clients' do
    it 'lists active clients' do
      active_client = create(:client, name: 'Acme Corp')
      deleted_client = create(:client, name: 'Deleted Co', deleted_at: Time.current)

      get clients_path

      expect(response).to have_http_status(:ok)
      expect(response.body).to include('Acme Corp')
      expect(response.body).not_to include('Deleted Co')
    end

    it 'filters clients by search term' do
      create(:client, name: 'Acme Corp')
      create(:client, name: 'Globex')

      get clients_path, params: { search: 'Acme' }

      expect(response.body).to include('Acme Corp')
      expect(response.body).not_to include('Globex')
    end

    context 'when not authenticated' do
      before { sign_out user }

      it 'redirects to sign in' do
        get clients_path

        expect(response).to redirect_to(new_user_session_path)
      end
    end
  end

  describe 'GET /clients/:id' do
    it 'shows the client' do
      client = create(:client, name: 'Acme Corp')

      get client_path(client)

      expect(response).to have_http_status(:ok)
      expect(response.body).to include('Acme Corp')
    end

    it 'returns 404 for a non-existent client' do
      get client_path(999_999)

      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'GET /clients/new' do
    it 'renders the new client form' do
      get new_client_path

      expect(response).to have_http_status(:ok)
      expect(response.body).to include('Nuevo cliente')
    end
  end

  describe 'GET /clients/:id/edit' do
    it 'renders the edit client form' do
      client = create(:client)

      get edit_client_path(client)

      expect(response).to have_http_status(:ok)
      expect(response.body).to include('Editar cliente')
    end
  end

  describe 'POST /clients' do
    let(:valid_attributes) do
      {
        name: 'Acme Corp',
        email: 'acme@example.com',
        industry: 'technology',
        company: 'Acme Inc.',
        phone: '+34 600 000 000',
        notes: 'Important client'
      }
    end

    it 'creates a new client' do
      expect {
        post clients_path, params: { client: valid_attributes }
      }.to change { Client.count }.by(1)

      expect(response).to redirect_to(clients_path)

      client = Client.last
      expect(client.name).to eq('Acme Corp')
      expect(client.email).to eq('acme@example.com')
      expect(client.company).to eq('Acme Inc.')
      expect(client.phone).to eq('+34 600 000 000')
      expect(client.notes).to eq('Important client')
    end

    it 'does not create a client with invalid attributes' do
      expect {
        post clients_path, params: { client: { name: '' } }
      }.not_to change { Client.count }

      expect(response).to have_http_status(:unprocessable_entity)
    end

    it 'does not create a client with a duplicate email' do
      create(:client, email: 'acme@example.com')

      expect {
        post clients_path, params: { client: valid_attributes }
      }.not_to change { Client.count }

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe 'PATCH /clients/:id' do
    it 'updates the client' do
      client = create(:client, name: 'Old Name')

      patch client_path(client), params: { client: { name: 'New Name' } }

      expect(response).to redirect_to(clients_path)
      expect(client.reload.name).to eq('New Name')
    end

    it 'does not update with invalid attributes' do
      client = create(:client, name: 'Old Name')

      patch client_path(client), params: { client: { name: '' } }

      expect(response).to have_http_status(:unprocessable_entity)
      expect(client.reload.name).to eq('Old Name')
    end
  end

  describe 'DELETE /clients/:id' do
    it 'soft deletes the client' do
      client = create(:client)

      delete client_path(client)

      expect(response).to redirect_to(clients_path)
      expect(client.reload.deleted_at).not_to be_nil
    end

    it 'removes the client from the active list' do
      client = create(:client, name: 'Acme Corp')

      delete client_path(client)
      follow_redirect!

      expect(response.body).not_to include('Acme Corp')
    end
  end
end
