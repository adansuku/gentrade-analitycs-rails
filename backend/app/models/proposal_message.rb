class ProposalMessage < ApplicationRecord
  belongs_to :proposal

  validates :role, presence: true, inclusion: { in: %w[user assistant] }
  validates :content, presence: true
end
