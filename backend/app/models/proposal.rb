class Proposal < ApplicationRecord
  belongs_to :client
  has_many :versions, class_name: 'ProposalVersion', dependent: :destroy
  has_many :messages, class_name: 'ProposalMessage', dependent: :destroy

  enum :status, {
    draft: 0,
    generating: 1,
    generated: 2,
    reviewed: 3,
    sent: 4,
    accepted: 5,
    rejected: 6
  }, prefix: true

  validates :status, presence: true

  after_initialize :set_default_status, if: :new_record?

  def current_version
    versions.order(version_number: :desc).first
  end

  def current_content
    current_version&.content
  end

  def version_count
    versions.count
  end

  def can_edit?
    !status_accepted? && !status_rejected?
  end

  private

  def set_default_status
    self.status ||= :draft
  end
end
