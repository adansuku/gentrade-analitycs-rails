# app/controllers/application_controller.rb
# Base controller for web views (HTML responses)
class ApplicationController < ActionController::Base
  # Include Pundit for authorization
  include Pundit::Authorization

  # CSRF protection for forms (skip for JSON API requests)
  protect_from_forgery with: :exception, unless: -> { request.format.json? }

  # Devise authentication (commented out for now - enable when ready)
  # before_action :authenticate_user!

  # Pundit: handle authorization errors
  rescue_from Pundit::NotAuthorizedError, with: :user_not_authorized
  rescue_from ActiveRecord::RecordNotFound, with: :not_found

  private

  def user_not_authorized
    flash[:alert] = "No tienes permisos para realizar esta acción."
    redirect_back(fallback_location: root_path)
  end

  def not_found
    respond_to do |format|
      format.html { render plain: 'Not found', status: :not_found }
      format.json { render json: { error: 'Not found' }, status: :not_found }
    end
  end
end
