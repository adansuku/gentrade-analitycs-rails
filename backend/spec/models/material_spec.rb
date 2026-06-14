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

  describe 'audio ↔ transcripción' do
    let(:client) { create(:client) }
    let(:audio) { create(:material, client: client, material_type: :audio, content: 'Audio: x.webm') }

    it '#transcript devuelve la transcripción vinculada por source_material_id' do
      transcript = create(:material, client: client, material_type: :transcript,
                                     content: 'texto', metadata: { 'source_material_id' => audio.id })

      expect(audio.transcript).to eq(transcript)
      expect(audio.transcribed?).to be true
    end

    it '#transcribed? es false si no hay transcripción' do
      expect(audio.transcribed?).to be false
      expect(audio.transcript).to be_nil
    end

    it '#source_audio devuelve el audio origen de una transcripción' do
      transcript = create(:material, client: client, material_type: :transcript,
                                     content: 'texto', metadata: { 'source_material_id' => audio.id })
      expect(transcript.source_audio).to eq(audio)
    end
  end

  describe '.type_from_filename' do
    it 'detecta audios comunes' do
      expect(Material.type_from_filename('a.mp3')).to eq(:audio)
      expect(Material.type_from_filename('a.wav')).to eq(:audio)
      expect(Material.type_from_filename('a.m4a')).to eq(:audio)
    end

    it 'detecta grabaciones del navegador (.webm/.ogg) como audio' do
      expect(Material.type_from_filename('grabacion-123.webm')).to eq(:audio)
      expect(Material.type_from_filename('grabacion-123.ogg')).to eq(:audio)
    end

    it 'detecta documentos por extensión' do
      expect(Material.type_from_filename('doc.pdf')).to eq(:pdf)
      expect(Material.type_from_filename('hoja.xlsx')).to eq(:xlsx)
      expect(Material.type_from_filename('texto.txt')).to eq(:txt)
    end

    it 'cae en :other para extensiones desconocidas' do
      expect(Material.type_from_filename('archivo.xyz')).to eq(:other)
    end
  end
end
