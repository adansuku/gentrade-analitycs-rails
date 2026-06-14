class ClientDailySnapshot < ApplicationRecord
  belongs_to :client

  validates :date, presence: true
  validates :date, uniqueness: { scope: :client_id }
end
