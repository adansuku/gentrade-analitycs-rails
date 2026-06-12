require 'sidekiq/web'

Rails.application.routes.draw do
  # Sidekiq Web UI (development only)
  mount Sidekiq::Web => '/sidekiq' if Rails.env.development?

  devise_for :users

  # API routes
  namespace :api do
    # Auth endpoints (outside v1 for compatibility with frontend)
    post 'auth/login', to: 'auth#login'
    post 'auth/logout', to: 'auth#logout'
    get 'auth/me', to: 'auth#me'

    namespace :v1 do
      resources :clients do
        resources :materials, only: [:index, :create, :destroy] do
          post 'upload', on: :collection
        end
        resources :proposals, only: [:index] do
          post 'generate', on: :collection
        end
      end

      resources :proposals, only: [:show, :update, :destroy] do
        post 'chat', on: :member
      end
    end
  end

  # Health check
  get "up" => "rails/health#show", as: :rails_health_check
end
