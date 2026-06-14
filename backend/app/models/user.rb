class User < ApplicationRecord
  # Include default devise modules
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable,
         :confirmable, :trackable

  # Roles: admin (0), manager (1), client (2), viewer (3)
  enum :role, { admin: 0, manager: 1, client: 2, viewer: 3 }, prefix: true

  # Validations
  validates :role, presence: true

  # Scopes
  scope :admins, -> { where(role: :admin) }
  scope :managers, -> { where(role: :manager) }

  # Methods
  def admin?
    role == 'admin'
  end

  def manager?
    role == 'manager'
  end

  def can_manage?
    role_admin? || role_manager?
  end

  # ── Google Drive ──────────────────────────────────────────────────────────

  def google_drive_connected?
    google_drive_token.present? || google_drive_refresh_token.present?
  end

  def google_drive_token_expired?
    google_drive_token_expires_at.present? && google_drive_token_expires_at <= Time.current
  end

  def update_google_drive_tokens!(access_token:, refresh_token: nil, expires_at: nil)
    attrs = { google_drive_token: access_token }
    attrs[:google_drive_refresh_token] = refresh_token if refresh_token.present?
    attrs[:google_drive_token_expires_at] = expires_at if expires_at
    update!(attrs)
  end
end
