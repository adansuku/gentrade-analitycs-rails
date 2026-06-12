# app/models/result.rb
class Result
  attr_reader :data, :errors

  def initialize(success:, data: {}, errors: [])
    @success = success
    @data = data
    @errors = errors
  end

  def success?
    @success
  end

  def failure?
    !@success
  end

  def self.success(**data)
    new(success: true, data: data)
  end

  def self.failure(errors:)
    new(success: false, errors: Array(errors))
  end

  # Convenient accessors
  def method_missing(method, *args)
    return data[method] if data.key?(method)
    super
  end

  def respond_to_missing?(method, include_private = false)
    data.key?(method) || super
  end
end
