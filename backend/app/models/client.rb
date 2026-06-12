class Client < ApplicationRecord
  # Associations
  has_many :materials, dependent: :destroy
  has_many :proposals, dependent: :destroy

  # Enums
  enum :industry, {
    technology: 0,
    retail: 1,
    finance: 2,
    healthcare: 3,
    education: 4,
    ecommerce: 5,
    other: 99
  }, prefix: true

  # Validations
  validates :name, presence: true, length: { in: 3..100 }
  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }

  # Scopes
  scope :active, -> { where(deleted_at: nil) }
  scope :recent, -> { order(created_at: :desc) }

  # Methods
  def soft_delete
    update(deleted_at: Time.current)
  end

  def active?
    deleted_at.nil?
  end

  def materials_count
    materials.count
  end

  def latest_proposal
    proposals.order(created_at: :desc).first
  end
end
