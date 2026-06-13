# frozen_string_literal: true

# Base controller for API endpoints
# Inherits from ActionController::API for lightweight JSON responses
class ApiController < ActionController::API
  rescue_from ActiveRecord::RecordNotFound, with: :not_found
  rescue_from ActionController::ParameterMissing, with: :bad_request

  private

  def current_user
    @current_user ||= authenticate_user
  end

  def authenticate_user
    header = request.headers['Authorization']
    return nil unless header

    token = header.split(' ').last
    decoded = JWT.decode(token, jwt_secret, true, algorithm: 'HS256')
    User.find(decoded[0]['user_id'])
  rescue JWT::DecodeError, ActiveRecord::RecordNotFound
    nil
  end

  def authenticate_user!
    render json: { error: 'Unauthorized' }, status: :unauthorized unless current_user
  end

  def jwt_secret
    ENV.fetch('JWT_SECRET', 'your-secret-key')
  end

  def not_found(exception)
    render json: { error: exception.message }, status: :not_found
  end

  def bad_request(exception)
    render json: { error: exception.message }, status: :bad_request
  end
end
