# frozen_string_literal: true

Sidekiq.configure_server do |config|
  config.redis = {
    url: ENV.fetch('REDIS_URL', 'redis://localhost:6380/0'),
    network_timeout: 5,
    pool_timeout: 5
  }

  # Ensure database connections are properly managed
  config.on(:startup) do
    Rails.logger.info 'Sidekiq server started'
  end

  config.on(:shutdown) do
    Rails.logger.info 'Sidekiq server stopped'
  end
end

Sidekiq.configure_client do |config|
  config.redis = {
    url: ENV.fetch('REDIS_URL', 'redis://localhost:6380/0'),
    network_timeout: 5,
    pool_timeout: 5
  }
end

# Error handler
Sidekiq.configure_server do |config|
  config.error_handlers << lambda { |exception, context|
    Rails.logger.error "Sidekiq error: #{exception.message}"
    Rails.logger.error "Context: #{context.inspect}"
  }
end
