require 'rails_helper'

RSpec.describe Client, type: :model do
  describe 'validations' do
    it 'is valid with valid attributes' do
      expect(build(:client)).to be_valid
    end

    it 'requires a name' do
      client = build(:client, name: nil)
      expect(client).not_to be_valid
      expect(client.errors[:name]).to be_present
    end

    it 'requires the name to be between 3 and 100 characters' do
      client = build(:client, name: 'ab')
      expect(client).not_to be_valid
      expect(client.errors[:name]).to be_present
    end

    it 'requires an email' do
      client = build(:client, email: nil)
      expect(client).not_to be_valid
      expect(client.errors[:email]).to be_present
    end

    it 'requires a valid email format' do
      client = build(:client, email: 'not-an-email')
      expect(client).not_to be_valid
      expect(client.errors[:email]).to be_present
    end

    it 'requires a unique email' do
      create(:client, email: 'duplicate@example.com')
      client = build(:client, email: 'duplicate@example.com')

      expect(client).not_to be_valid
      expect(client.errors[:email]).to be_present
    end
  end

  describe 'metadata-backed attributes' do
    it 'stores company, phone and notes in metadata' do
      client = create(:client, company: 'Acme Inc.', phone: '+34 600 000 000', notes: 'VIP client')

      expect(client.metadata['company']).to eq('Acme Inc.')
      expect(client.metadata['phone']).to eq('+34 600 000 000')
      expect(client.metadata['notes']).to eq('VIP client')

      client.reload
      expect(client.company).to eq('Acme Inc.')
      expect(client.phone).to eq('+34 600 000 000')
      expect(client.notes).to eq('VIP client')
    end
  end

  describe 'scopes' do
    describe '.active' do
      it 'returns only clients without deleted_at' do
        active_client = create(:client)
        deleted_client = create(:client, deleted_at: Time.current)

        expect(Client.active).to include(active_client)
        expect(Client.active).not_to include(deleted_client)
      end
    end

    describe '.recent' do
      it 'orders clients by created_at descending' do
        older = create(:client, created_at: 2.days.ago)
        newer = create(:client, created_at: 1.day.ago)

        expect(Client.recent.to_a).to eq([newer, older])
      end
    end
  end

  describe '#soft_delete' do
    it 'sets deleted_at' do
      client = create(:client)

      expect { client.soft_delete }.to change { client.deleted_at }.from(nil)
      expect(client.active?).to be false
    end
  end

  describe '#active?' do
    it 'returns true when deleted_at is nil' do
      expect(build(:client, deleted_at: nil).active?).to be true
    end

    it 'returns false when deleted_at is present' do
      expect(build(:client, deleted_at: Time.current).active?).to be false
    end
  end

  describe '#materials_count' do
    it 'returns the number of associated materials' do
      client = create(:client)
      create_list(:material, 2, client: client)

      expect(client.materials_count).to eq(2)
    end
  end

  describe '#latest_proposal' do
    it 'returns the most recently created proposal' do
      client = create(:client)
      older = create(:proposal, client: client, created_at: 2.days.ago)
      newer = create(:proposal, client: client, created_at: 1.day.ago)

      expect(client.latest_proposal).to eq(newer)
      expect(client.latest_proposal).not_to eq(older)
    end

    it 'returns nil when there are no proposals' do
      client = create(:client)
      expect(client.latest_proposal).to be_nil
    end
  end
end
