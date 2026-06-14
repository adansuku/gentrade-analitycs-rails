require 'rails_helper'

RSpec.describe Material, type: :model do
  describe 'associations' do
    it 'belongs to a client' do
      material = build(:material, client: create(:client))
      expect(material.client).to be_a(Client)
    end
  end

  describe 'validations' do
    it 'is valid with valid attributes' do
      expect(build(:material, client: create(:client))).to be_valid
    end

    it 'requires a material_type' do
      material = build(:material, client: create(:client), material_type: nil)
      expect(material).not_to be_valid
      expect(material.errors[:material_type]).to be_present
    end

    it 'requires content when no file_url is present' do
      material = build(:material, client: create(:client), content: nil, file_url: nil)
      expect(material).not_to be_valid
      expect(material.errors[:content]).to be_present
    end

    it 'does not require content when a file_url is present' do
      material = build(:material, client: create(:client), content: nil, file_url: '/uploads/file.pdf')
      expect(material).to be_valid
    end
  end

  describe 'material_type enum' do
    it 'supports the expected types' do
      expect(Material.material_types.keys).to contain_exactly(
        'email', 'csv', 'xlsx', 'audio', 'transcript', 'pdf', 'txt', 'docx', 'note', 'other'
      )
    end

    it 'exposes prefixed predicate methods' do
      material = build(:material, client: create(:client), material_type: :pdf)
      expect(material.material_type_pdf?).to be true
      expect(material.material_type_note?).to be false
    end
  end
end
