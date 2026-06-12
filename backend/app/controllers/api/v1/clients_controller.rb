module Api
  module V1
    class ClientsController < ApplicationController
      before_action :set_client, only: [:show, :update, :destroy]

      # GET /api/v1/clients
      def index
        @clients = Client.active.recent.all

        render json: {
          clients: @clients.map { |client| client_json(client) }
        }
      end

      # GET /api/v1/clients/:id
      def show
        render json: client_json_with_details(@client)
      end

      # POST /api/v1/clients
      def create
        @client = Client.new(client_params)

        if @client.save
          render json: client_json(@client), status: :created
        else
          render json: { errors: @client.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # PUT/PATCH /api/v1/clients/:id
      def update
        if @client.update(client_params)
          render json: client_json(@client)
        else
          render json: { errors: @client.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/clients/:id
      def destroy
        @client.soft_delete
        head :no_content
      end

      private

      def set_client
        @client = Client.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Client not found' }, status: :not_found
      end

      def client_params
        if params.key?(:client)
          params.require(:client).permit(:name, :email, :industry, :description, metadata: {})
        else
          params.permit(:name, :email, :industry, :description, :phone, :company, :notes)
        end
      end

      def client_json(client)
        {
          id: client.id,
          name: client.name,
          email: client.email,
          industry: client.industry,
          description: client.description,
          metadata: client.metadata,
          created_at: client.created_at.iso8601,
          updated_at: client.updated_at.iso8601,
          materials_count: client.materials.count,
          proposals_count: client.proposals.count
        }
      end

      def client_json_with_details(client)
        client_json(client).merge(
          materials: client.materials.map { |m| material_json(m) },
          proposals: client.proposals.map { |p| proposal_json(p) }
        )
      end

      def material_json(material)
        {
          id: material.id,
          material_type: material.material_type,
          content: material.content,
          file_url: material.file_url,
          created_at: material.created_at.iso8601
        }
      end

      def proposal_json(proposal)
        {
          id: proposal.id,
          status: proposal.status,
          title: proposal.title,
          created_at: proposal.created_at.iso8601,
          updated_at: proposal.updated_at.iso8601,
          version_count: proposal.versions.count
        }
      end
    end
  end
end
