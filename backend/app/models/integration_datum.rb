class IntegrationDatum < ApplicationRecord
  self.table_name = "integration_data"

  belongs_to :integration

  validates :category, presence: true
  validates :fetched_at, presence: true
end
