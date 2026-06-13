# frozen_string_literal: true

class Integration < ApplicationRecord
  belongs_to :client
  has_many :metrics, dependent: :destroy

  # Enums
  enum :status, { active: 0, expired: 1, revoked: 2, error: 3 }, default: :active
  enum :provider, { google: 0, meta: 1, shopify: 2 }, _prefix: true

  # Validations
  validates :provider, presence: true, uniqueness: { scope: :client_id }
  validates :access_token, presence: true
  validates :client, presence: true

  # Scopes
  scope :active, -> { where(status: :active) }
  scope :expired, -> { where('expires_at < ?', Time.current) }
  scope :valid_tokens, -> { active.where('expires_at > ? OR expires_at IS NULL', Time.current) }

  # Methods
  def expired?
    expires_at.present? && expires_at < Time.current
  end

  def needs_refresh?
    return false if refresh_token.blank?
    expires_at.present? && expires_at < 1.hour.from_now
  end

  def provider_name
    provider.to_s.capitalize
  end

  def mask_token(token)
    return nil if token.blank?
    "#{token[0...8]}...#{token[-4..-1]}"
  end

  def masked_access_token
    mask_token(access_token)
  end
end
