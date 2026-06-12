module Api
  module V1
    class ProposalsController < ApplicationController
      before_action :set_proposal, only: [:show, :update, :destroy, :chat]

      # GET /api/v1/proposals/:id
      def show
        render json: proposal_json_with_details(@proposal)
      end

      # GET /api/v1/clients/:client_id/proposals
      def index
        client = Client.find(params[:client_id])
        @proposals = client.proposals.order(created_at: :desc)

        render json: @proposals.map { |proposal| proposal_json(proposal) }
      end

      # POST /api/v1/clients/:client_id/proposals/generate
      def generate
        client = Client.find(params[:client_id])
        material_ids = params[:material_ids] || []

        # Validate materials
        materials = client.materials.where(id: material_ids)
        if materials.empty?
          return render json: { error: 'No materials selected' }, status: :bad_request
        end

        # Create proposal
        @proposal = client.proposals.create!(
          status: :generating,
          title: "Propuesta para #{client.name}",
          metadata: { material_ids: material_ids }
        )

        # Enqueue background job for AI generation
        ProposalGenerationJob.perform_later(@proposal.id, client.id, material_ids)

        render json: proposal_json(@proposal).merge(
          message: 'Proposal generation started. Check status for updates.'
        ), status: :accepted
      rescue ActiveRecord::RecordNotFound => e
        render json: { error: e.message }, status: :not_found
      rescue StandardError => e
        @proposal&.update(status: :draft)
        render json: { error: e.message }, status: :unprocessable_entity
      end

      # POST /api/v1/proposals/:id/chat
      def chat
        message = params[:message]
        if message.blank?
          return render json: { error: 'Message is required' }, status: :bad_request
        end

        # Save user message
        user_msg = @proposal.messages.create!(role: 'user', content: message)

        # Enqueue background job for AI editing
        ProposalEditJob.perform_later(@proposal.id, user_msg.id, message)

        render json: {
          proposal: proposal_json(@proposal),
          message: 'Processing your edit request. Check proposal for updates.'
        }, status: :accepted
      rescue StandardError => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      # PATCH /api/v1/proposals/:id
      def update
        if @proposal.update(proposal_params)
          render json: proposal_json(@proposal)
        else
          render json: { errors: @proposal.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/proposals/:id
      def destroy
        @proposal.destroy
        head :no_content
      end

      private

      def set_proposal
        @proposal = Proposal.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Proposal not found' }, status: :not_found
      end

      def proposal_params
        params.require(:proposal).permit(:title, :status, metadata: {})
      end

      def proposal_json(proposal)
        {
          id: proposal.id,
          client_id: proposal.client_id,
          title: proposal.title,
          status: proposal.status,
          metadata: proposal.metadata,
          version_count: proposal.versions.count,
          created_at: proposal.created_at.iso8601,
          updated_at: proposal.updated_at.iso8601
        }
      end

      def proposal_json_with_details(proposal)
        current_version = proposal.current_version

        proposal_json(proposal).merge(
          current_version: current_version ? {
            id: current_version.id,
            version_number: current_version.version_number,
            content: current_version.content,
            created_at: current_version.created_at.iso8601
          } : nil,
          versions: proposal.versions.order(version_number: :desc).map { |v|
            {
              id: v.id,
              version_number: v.version_number,
              content: v.content,
              created_at: v.created_at.iso8601
            }
          },
          messages: proposal.messages.order(created_at: :asc).map { |m|
            {
              id: m.id,
              role: m.role,
              content: m.content,
              created_at: m.created_at.iso8601
            }
          }
        )
      end

    end
  end
end
