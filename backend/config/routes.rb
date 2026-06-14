require 'sidekiq/web'

Rails.application.routes.draw do
  # Sidekiq Web UI (development only)
  mount Sidekiq::Web => '/sidekiq' if Rails.env.development?

  devise_for :users

  # Root path - will be the dashboard later
  # For now, redirect to login if not authenticated
  authenticated :user do
    root to: 'dashboard#index', as: :authenticated_root
  end
  root to: redirect('/users/sign_in')

  # Web routes (HTML views)
  resources :clients do
    resources :materials, only: [:new, :create, :destroy] do
      post 'upload', on: :collection
    end
  end

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
        resources :metrics, only: [:index] do
          get 'summary', on: :collection
          post 'sync', on: :collection
        end

        # Reports
        resources :reports, only: [] do
          collection do
            get  'daily',                   to: 'reports#daily'
            get  'weekly',                  to: 'reports#weekly'
            get  'monthly',                 to: 'reports#monthly'

            post 'narrative/regenerate',    to: 'reports#regenerate_narrative'
            delete 'cache',                  to: 'reports#clear_cache'

            get  'objectives',              to: 'reports#objectives'
            put  'objectives',              to: 'reports#upsert_objectives'
            post 'objectives/copy',         to: 'reports#copy_objectives'

            get  'costs',                   to: 'reports#costs'
            put  'costs',                   to: 'reports#upsert_costs'

            get  'compare',                 to: 'reports#compare'
            get  'explorer',                to: 'reports#explorer_summary'
            get  'explorer/data',           to: 'reports#explorer_data'
            get  'ingestion',               to: 'reports#ingestion_summary'

            delete 'integration_data/:integration_id', to: 'reports#delete_integration_data',
                   as: :delete_integration_data

            post   'backfill/:integration_id',        to: 'reports#start_backfill'
            get    'backfill/:integration_id/status', to: 'reports#backfill_status'
          end
        end

        # Insights
        resources :insights, only: [:index, :create]
      end

      resources :proposals, only: [:show, :update, :destroy] do
        post 'chat', on: :member
      end

      # Integration detail endpoint (not nested)
      resources :integrations, only: [:show] do
        member do
          get 'slack/channels', to: 'integrations#slack_channels'
          post 'slack/send_report', to: 'integrations#slack_send_report'
        end
      end

      # OAuth endpoints (public, not nested)
      # Google OAuth
      get 'integrations/google/auth', to: 'integrations#google_auth'
      get 'integrations/google/callback', to: 'integrations#google_callback'
      get 'integrations/:id/google/ads_accounts', to: 'integrations#google_ads_accounts'

      # Meta OAuth
      get 'integrations/meta/auth', to: 'integrations#meta_auth'
      get 'integrations/meta/callback', to: 'integrations#meta_callback'

      # Slack OAuth
      get 'integrations/slack/auth', to: 'integrations#slack_auth'
      get 'integrations/slack/callback', to: 'integrations#slack_callback'
    end
  end

  # Health check
  get "up" => "rails/health#show", as: :rails_health_check
end
