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
        params = {
          client_id: ENV['GOOGLE_CLIENT_ID'],
          redirect_uri: drive_redirect_uri,
          response_type: 'code',
          scope: scopes,
          access_type: 'offline',
          prompt: 'consent',
          state: drive_state_token(current_user.id)
        }
        query = params.map { |k, v| "#{k}=#{CGI.escape(v.to_s)}" }.join('&')

        render json: { auth_url: "https://accounts.google.com/o/oauth2/v2/auth?#{query}" }
      end

      # GET /api/v1/drive/callback → intercambia código y guarda tokens en el user
      def callback
        user_id = decode_drive_state(params[:state])
        return redirect_to_frontend(error: 'invalid_state') unless user_id

        user = User.find_by(id: user_id)
        return redirect_to_frontend(error: 'user_not_found') unless user

        tokens = exchange_drive_code(params[:code])
        return redirect_to_frontend(error: tokens[:error]) if tokens[:error]

        user.update_google_drive_tokens!(
          access_token: tokens[:access_token],
          refresh_token: tokens[:refresh_token],
          expires_at: tokens[:expires_at]
        )

        redirect_to_frontend(drive: 'connected')
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

      def drive_state_token(user_id)
        payload = { user_id: user_id, exp: 10.minutes.from_now.to_i }
        JWT.encode(payload, Rails.application.secret_key_base, 'HS256')
      end

      def decode_drive_state(token)
        return nil if token.blank?

        payload = JWT.decode(token, Rails.application.secret_key_base, true, algorithm: 'HS256').first
        payload['user_id']
      rescue JWT::DecodeError
        nil
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

      def redirect_to_frontend(params)
        base = ENV['FRONTEND_URL'].presence || request.base_url
        query = params.map { |k, v| "#{k}=#{CGI.escape(v.to_s)}" }.join('&')
        redirect_to "#{base}?#{query}", allow_other_host: true
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
