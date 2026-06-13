# frozen_string_literal: true

class Metric < ApplicationRecord
  belongs_to :client
  belongs_to :integration

  # Enums
  enum :source, {
    google_analytics: 0,
    google_ads: 1,
    meta_ads: 2,
    shopify: 3
  }, _prefix: true

  # Validations
  validates :source, presence: true
  validates :metric_type, presence: true
  validates :value, presence: true, numericality: true
  validates :date, presence: true

  # Scopes
  scope :recent, -> { order(date: :desc) }
  scope :for_date_range, ->(start_date, end_date) { where(date: start_date..end_date) }
  scope :by_type, ->(type) { where(metric_type: type) }
  scope :this_month, -> { where(date: Date.current.beginning_of_month..Date.current.end_of_month) }
  scope :last_month, -> { where(date: 1.month.ago.beginning_of_month..1.month.ago.end_of_month) }
  scope :today, -> { where(date: Date.current) }

  # Methods
  def self.metric_types
    pluck(:metric_type).uniq.sort
  end

  def self.sum_by_type(type)
    by_type(type).sum(:value)
  end

  def self.avg_by_type(type)
    by_type(type).average(:value)
  end

  def source_name
    source.to_s.titleize
  end
end
