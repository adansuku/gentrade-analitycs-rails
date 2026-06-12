module Api
  class AuthController < ApplicationController
    # POST /api/auth/login
    def login
      email = params[:email]
      password = params[:password]

      if email.blank? || password.blank?
        return render json: { error: 'Email and password are required' }, status: :bad_request
      end

      user = User.find_by(email: email)

      if user && user.valid_password?(password)
        token = generate_jwt(user)
        render json: {
          token: token,
          user: {
            id: user.id,
            email: user.email
          }
        }
      else
        render json: { error: 'Invalid credentials' }, status: :unauthorized
      end
    end

    # POST /api/auth/logout
    def logout
      # For stateless JWT, logout is handled on frontend
      head :no_content
    end

    # GET /api/auth/me
    def me
      if current_user
        render json: {
          id: current_user.id,
          email: current_user.email
        }
      else
        render json: { error: 'No token provided' }, status: :unauthorized
      end
    end

    private

    def generate_jwt(user)
      payload = {
        user_id: user.id,
        email: user.email,
        exp: 24.hours.from_now.to_i
      }

      JWT.encode(payload, jwt_secret, 'HS256')
    end
  end
end
