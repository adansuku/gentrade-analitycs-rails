class Material < ApplicationRecord
  belongs_to :client

  has_one_attached :file

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
  validates :content, presence: true, unless: :has_file?

  EXTENSION_TYPES = {
    '.pdf'  => :pdf,
    '.doc'  => :docx, '.docx' => :docx,
    '.xls'  => :xlsx, '.xlsx' => :xlsx,
    '.csv'  => :csv,
    '.txt'  => :txt,
    '.mp3'  => :audio, '.wav' => :audio, '.m4a' => :audio, '.ogg' => :audio, '.webm' => :audio,
  }.freeze

  def self.type_from_filename(filename)
    ext = File.extname(filename.to_s).downcase
    EXTENSION_TYPES[ext] || :other
  end

  def has_file?
    file.attached? || file_url.present?
  end
end
