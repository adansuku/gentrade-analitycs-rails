class ClientReportObjective < ApplicationRecord
  belongs_to :client

  validates :year_month, presence: true
  validates :year_month, uniqueness: { scope: :client_id }
end
