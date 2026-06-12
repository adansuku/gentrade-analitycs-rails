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
        # TODO: Implement GenerateProposalJob
        # GenerateProposalJob.perform_later(@proposal.id, material_ids)

        # For now, create a dummy version
        @proposal.versions.create!(
          version_number: 1,
          content: generate_dummy_content(client, materials)
        )
        @proposal.update!(status: :generated)

        render json: proposal_json_with_details(@proposal), status: :created
      rescue ActiveRecord::RecordNotFound => e
        render json: { error: e.message }, status: :not_found
      rescue StandardError => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      # POST /api/v1/proposals/:id/chat
      def chat
        message = params[:message]
        if message.blank?
          return render json: { error: 'Message is required' }, status: :bad_request
        end

        # Save user message
        @proposal.messages.create!(role: 'user', content: message)

        # TODO: Implement AI chat editing
        # For now, just echo back
        assistant_message = "Propuesta actualizada según tu solicitud: #{message}"
        @proposal.messages.create!(role: 'assistant', content: assistant_message)

        # Create new version (dummy)
        current_version = @proposal.current_version
        new_version_number = current_version ? current_version.version_number + 1 : 1

        @proposal.versions.create!(
          version_number: new_version_number,
          content: "#{current_version&.content}\n\n[Editado: #{message}]"
        )

        render json: {
          proposal: proposal_json_with_details(@proposal),
          message: assistant_message
        }
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

      def generate_dummy_content(client, materials)
        <<~MARKDOWN
          # Propuesta Comercial para #{client.name}

          ## Resumen Ejecutivo

          Esta propuesta presenta una solución integral para las necesidades de #{client.name} en el sector #{client.industry || 'tecnológico'}.

          ## Materiales Analizados

          #{materials.map { |m| "- #{m.material_type.humanize}: #{m.content.truncate(100)}" }.join("\n")}

          ## Solución Propuesta

          Basándonos en el análisis de los materiales proporcionados, proponemos una estrategia integral que incluye:

          1. **Análisis de Situación Actual**
             - Evaluación de procesos existentes
             - Identificación de áreas de mejora

          2. **Implementación de Soluciones**
             - Optimización de procesos
             - Integración de tecnologías

          3. **Seguimiento y Resultados**
             - Métricas de éxito
             - Reportes periódicos

          ## Inversión

          Inversión estimada a definir según alcance específico.

          ## Próximos Pasos

          1. Revisión de propuesta
          2. Reunión de alineación
          3. Inicio de proyecto

          ---

          *Propuesta generada automáticamente. Puede ser editada mediante el chat.*
        MARKDOWN
      end
    end
  end
end
