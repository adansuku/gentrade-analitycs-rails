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
        resources :integrations, only: [:index, :create, :destroy]
      end

      resources :proposals, only: [:show, :update, :destroy] do
        post 'chat', on: :member
      end

      # Integration detail endpoint (not nested)
      resources :integrations, only: [:show]

      # OAuth endpoints (public, not nested)
      # Google OAuth
      get 'integrations/google/auth', to: 'integrations#google_auth'
      get 'integrations/google/callback', to: 'integrations#google_callback'

      # Meta OAuth
      get 'integrations/meta/auth', to: 'integrations#meta_auth'
      get 'integrations/meta/callback', to: 'integrations#meta_callback'
    end
  end

  # Health check
  get "up" => "rails/health#show", as: :rails_health_check
end
