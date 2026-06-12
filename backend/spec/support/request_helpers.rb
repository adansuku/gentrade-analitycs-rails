# spec/support/request_helpers.rb
module RequestHelpers
  def json_response
    JSON.parse(response.body)
  end

  def auth_headers(user)
    token = JWT.encode({ user_id: user.id }, jwt_secret, 'HS256')
    { 'Authorization' => "Bearer #{token}" }
  end

  private

  def jwt_secret
    ENV.fetch('JWT_SECRET', 'your-secret-key')
  end
end

RSpec.configure do |config|
  config.include RequestHelpers, type: :request
end
