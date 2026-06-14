module Api
  module V1
    class MaterialsController < ApplicationController
      before_action :set_client
      before_action :set_material, only: [:destroy]

      # GET /api/v1/clients/:client_id/materials
      def index
        @materials = @client.materials.order(created_at: :desc)

        render json: { materials: @materials.map { |material| material_json(material) } }
      end

      # POST /api/v1/clients/:client_id/materials
      def create
        @material = @client.materials.new(material_params)

        if @material.save
          render json: material_json(@material), status: :created
        else
          render json: { errors: @material.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/clients/:client_id/materials/upload
      def upload
        unless params[:file].present?
          return render json: { error: 'No file provided' }, status: :bad_request
        end

        file = params[:file]
        material_type = Material.type_from_filename(file.original_filename)

        @material = @client.materials.create!(
          material_type: material_type,
          content: extract_content(file),
          file_url: store_file(file),
          metadata: {
            original_filename: file.original_filename,
            content_type: file.content_type,
            size: file.size
          }
        )

        TranscriptionJob.perform_later(@material.id) if @material.material_type_audio?

        render json: { material: material_json(@material) }, status: :created
      rescue StandardError => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      # DELETE /api/v1/clients/:client_id/materials/:id
      def destroy
        @material.destroy
        head :no_content
      end

      private

      def set_client
        @client = Client.find(params[:client_id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Client not found' }, status: :not_found
      end

      def set_material
        @material = @client.materials.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Material not found' }, status: :not_found
      end

      def material_params
        params.require(:material).permit(:material_type, :content, :file_url, metadata: {})
      end

      def material_json(material)
        {
          id: material.id,
          client_id: material.client_id,
          material_type: material.material_type,
          content: material.content,
          file_url: material.file_url,
          metadata: material.metadata,
          created_at: material.created_at.iso8601,
          updated_at: material.updated_at.iso8601
        }
      end

      def extract_content(file)
        # Simple text extraction for now
        # TODO: Implement proper file parsing based on type
        if file.content_type&.include?('text')
          file.read
        else
          "File uploaded: #{file.original_filename}"
        end
      end

      def store_file(file)
        # TODO: Implement proper file storage (ActiveStorage or S3)
        # For now, just return a placeholder
        "/uploads/#{@client.id}/#{SecureRandom.uuid}_#{file.original_filename}"
      end
    end
  end
end
