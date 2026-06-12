class Material < ApplicationRecord
  belongs_to :client

  enum :material_type, {
    email: 0,
    csv: 1,
    xlsx: 2,
    audio: 3,
    transcript: 4,
    pdf: 5,
    txt: 6,
    docx: 7,
    note: 8,
    other: 99
  }, prefix: true

  validates :material_type, presence: true
  validates :content, presence: true
end
