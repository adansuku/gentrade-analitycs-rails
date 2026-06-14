class ClientsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_client, only: [:show, :edit, :update, :destroy]

  def index
    load_clients
  end

  def show
    @materials = @client.materials.order(created_at: :desc)
    @proposals = @client.proposals.includes(:versions).order(created_at: :desc)
  end

  def new
    @client = Client.new
  end

  def create
    @client = Client.new(client_params)

    if @client.save
      load_clients # Load updated list for turbo stream
      respond_to do |format|
        format.html { redirect_to clients_path, notice: 'Cliente creado exitosamente.' }
        format.turbo_stream
      end
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @client.update(client_params)
      load_clients # Load updated list for turbo stream
      respond_to do |format|
        format.html { redirect_to clients_path, notice: 'Cliente actualizado exitosamente.' }
        format.turbo_stream
      end
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @client.soft_delete
    redirect_to clients_path, notice: 'Cliente eliminado exitosamente.'
  end

  private

  def set_client
    @client = Client.find(params[:id])
  end

  def load_clients
    @clients = Client.active

    # Search functionality
    if params[:search].present?
      search_term = "%#{params[:search]}%"
      @clients = @clients.where(
        "name ILIKE ? OR email ILIKE ?",
        search_term, search_term
      )
    end

    # Add proposal count
    @clients = @clients.left_joins(:proposals)
                       .group('clients.id')
                       .select('clients.*, COUNT(proposals.id) as proposals_count')
                       .order(created_at: :desc)
  end

  def client_params
    params.require(:client).permit(:name, :email, :industry, :description, :company, :phone, :notes, metadata: {})
  end
end
