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
end
