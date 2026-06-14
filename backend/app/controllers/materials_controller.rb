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
      # Transcribe audios en background (Whisper) → crea material `transcript`.
      TranscriptionJob.perform_later(@material.id) if @material.material_type_audio?

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

  # GET /clients/:client_id/materials/search?q=...
  # Búsqueda semántica (RAG): recupera fragmentos similares de Qdrant y
  # devuelve los materiales correspondientes rankeados por similitud.
  def search
    query = params[:q].to_s.strip
    return render(json: { results: [] }) if query.blank?

    hits = Embeddings::Client.new.search(query, client_id: @client.id, top_k: 20)

    # Agrupa por material y conserva el mejor score; preserva el orden por score.
    best_by_material = {}
    hits.each do |hit|
      mid = hit[:material_id]
      next if mid.nil?

      best_by_material[mid] = [best_by_material[mid] || 0, hit[:score].to_f].max
    end

    materials = @client.materials.where(id: best_by_material.keys).index_by(&:id)
    results = best_by_material
              .sort_by { |_id, score| -score }
              .filter_map do |mid, score|
                m = materials[mid]
                next unless m

                { id: m.id, title: m.title, material_type: m.material_type, score: score.round(4) }
              end

    render json: { results: results }
  rescue StandardError => e
    render json: { results: [], error: e.message }, status: :unprocessable_entity
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
