# frozen_string_literal: true

module Api
  module V1
    # Google Drive: OAuth de conexión + listado e importación de archivos como
    # materiales. Los tokens se guardan en el usuario (User#google_drive_*).
    class DriveController < ApplicationController
      before_action :authenticate_user!, except: [:callback]

      # GET /api/v1/drive/status
      def status
        render json: { connected: current_user.google_drive_connected? }
      end

      # GET /api/v1/drive/auth → URL de autorización de Google (scope Drive readonly)
      def auth
        scopes = 'https://www.googleapis.com/auth/drive.readonly'
        oauth_params = {
          client_id: ENV['GOOGLE_CLIENT_ID'],
          redirect_uri: drive_redirect_uri,
          response_type: 'code',
          scope: scopes,
          access_type: 'offline',
          prompt: 'consent',
          state: drive_state_token(current_user.id, params[:return_to])
        }
        query = oauth_params.map { |k, v| "#{k}=#{CGI.escape(v.to_s)}" }.join('&')

        render json: { auth_url: "https://accounts.google.com/o/oauth2/v2/auth?#{query}" }
      end

      # GET /api/v1/drive/callback → intercambia código y guarda tokens en el user
      def callback
        state = decode_drive_state(params[:state])
        return_to = state['return_to']
        return redirect_after(return_to, error: 'invalid_state') unless state['user_id']

        user = User.find_by(id: state['user_id'])
        return redirect_after(return_to, error: 'user_not_found') unless user

        tokens = exchange_drive_code(params[:code])
        return redirect_after(return_to, error: tokens[:error]) if tokens[:error]

        user.update_google_drive_tokens!(
          access_token: tokens[:access_token],
          refresh_token: tokens[:refresh_token],
          expires_at: tokens[:expires_at]
        )

        redirect_after(return_to, drive: 'connected')
      end

      # GET /api/v1/drive/files?folder_id=&query=&page_token=
      def files
        result = GoogleDrive::Client.new(current_user).list_files(
          folder_id: params[:folder_id],
          query: params[:query],
          page_token: params[:page_token]
        )
        render json: result
      rescue GoogleDrive::Client::NotConnectedError => e
        render json: { error: e.message, connected: false }, status: :unauthorized
      rescue StandardError => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      # POST /api/v1/clients/:client_id/drive/import  { file_id: }
      def import
        client = Client.find(params[:client_id])
        return render json: { error: 'file_id is required' }, status: :bad_request if params[:file_id].blank?

        material = GoogleDrive::Importer.new(user: current_user, client: client).import(params[:file_id])
        render json: { material: material_json(material) }, status: :created
      rescue GoogleDrive::Client::NotConnectedError => e
        render json: { error: e.message, connected: false }, status: :unauthorized
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Client not found' }, status: :not_found
      rescue StandardError => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      private

      def drive_redirect_uri
        ENV['GOOGLE_REDIRECT_URI'] || "#{request.base_url}/api/v1/drive/callback"
      end

      def drive_state_token(user_id, return_to = nil)
        payload = { user_id: user_id, return_to: return_to, exp: 10.minutes.from_now.to_i }
        JWT.encode(payload, Rails.application.secret_key_base, 'HS256')
      end

      def decode_drive_state(token)
        return {} if token.blank?

        JWT.decode(token, Rails.application.secret_key_base, true, algorithm: 'HS256').first
      rescue JWT::DecodeError
        {}
      end

      def exchange_drive_code(code)
        response = HTTP.post('https://oauth2.googleapis.com/token', form: {
          code: code,
          client_id: ENV['GOOGLE_CLIENT_ID'],
          client_secret: ENV['GOOGLE_CLIENT_SECRET'],
          redirect_uri: drive_redirect_uri,
          grant_type: 'authorization_code'
        })

        if response.status.success?
          data = JSON.parse(response.body)
          {
            access_token: data['access_token'],
            refresh_token: data['refresh_token'],
            expires_at: data['expires_in']&.seconds&.from_now
          }
        else
          { error: 'token_exchange_failed' }
        end
      rescue StandardError => e
        { error: e.message }
      end

      # Vuelve a la app (Rails). Respeta return_to solo si es una ruta interna
      # (empieza por "/") para evitar open-redirects; si no, va a la raíz.
      def redirect_after(return_to, params)
        path = return_to.to_s.start_with?('/') ? return_to : '/'
        separator = path.include?('?') ? '&' : '?'
        query = params.map { |k, v| "#{k}=#{CGI.escape(v.to_s)}" }.join('&')
        redirect_to "#{path}#{separator}#{query}", allow_other_host: false
      end

      def material_json(material)
        {
          id: material.id,
          title: material.title,
          material_type: material.material_type,
          content: material.content,
          metadata: material.metadata,
          created_at: material.created_at.iso8601
        }
      end
    end
  end
end
