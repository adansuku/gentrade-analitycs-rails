# app/controllers/application_controller.rb
# Base controller for web views (HTML responses)
class ApplicationController < ActionController::Base
  # CSRF protection for forms (skip for JSON API requests)
  protect_from_forgery with: :exception, unless: -> { request.format.json? }

  # Devise authentication will be added here
  # before_action :authenticate_user!

  rescue_from ActiveRecord::RecordNotFound, with: :not_found

  private

  def not_found
    respond_to do |format|
      format.html { render file: "#{Rails.root}/public/404.html", status: :not_found, layout: false }
      format.json { render json: { error: 'Not found' }, status: :not_found }
    end
  end
end
