class MaterialsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_client

  def new
    @material = @client.materials.new
  end

  def create
    @material = @client.materials.new(material_params)

    if @material.save
      @materials = reload_materials
      respond_to do |format|
        format.html { redirect_to client_path(@client), notice: 'Material añadido.' }
        format.turbo_stream
      end
    else
      render :new, status: :unprocessable_entity
    end
  end

  def upload
    file = params[:file]
    return render json: { error: 'No se ha proporcionado ningún archivo' }, status: :bad_request unless file

    detected_type = Material.type_from_filename(file.original_filename)
    content = extract_text(file, detected_type)

    @material = @client.materials.new(
      material_type: detected_type,
      title: File.basename(file.original_filename, '.*').humanize,
      content: content.presence || "Archivo: #{file.original_filename}",
      metadata: {
        original_filename: file.original_filename,
        content_type:      file.content_type,
        size:              file.size
      }
    )
    @material.file.attach(file)

    if @material.save
      @materials = reload_materials
      respond_to do |format|
        format.html { redirect_to client_path(@client), notice: 'Archivo subido correctamente.' }
        format.turbo_stream { render :create }
        format.json { render json: material_json(@material), status: :created }
      end
    else
      render json: { errors: @material.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @material = @client.materials.find(params[:id])
    @material.destroy
    @materials = reload_materials
    respond_to do |format|
      format.html { redirect_to client_path(@client), notice: 'Material eliminado.' }
      format.turbo_stream
    end
  end

  private

  def set_client
    @client = Client.find(params[:client_id])
  end

  def reload_materials
    @client.materials.order(created_at: :desc)
  end

  def material_params
    params.require(:material).permit(:title, :material_type, :content)
  end

  def extract_text(file, type)
    return file.read if type == :txt || file.content_type&.start_with?('text/')
    nil
  end

  def material_json(material)
    {
      id: material.id,
      title: material.title,
      material_type: material.material_type,
      content: material.content,
      file_url: material.file.attached? ? url_for(material.file) : nil,
      metadata: material.metadata,
      created_at: material.created_at.iso8601
    }
  end
end
