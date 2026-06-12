class ProposalVersion < ApplicationRecord
  belongs_to :proposal

  validates :version_number, presence: true, uniqueness: { scope: :proposal_id }
  validates :content, presence: true
end
