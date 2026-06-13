class DashboardController < ApplicationController
  before_action :authenticate_user!

  def index
    # Get all active clients
    @clients = Client.active.includes(:proposals, :materials).order(created_at: :desc)

    # Calculate totals
    @totals = {
      clients: @clients.count,
      proposals: Proposal.count,
      materials: Material.count,
      proposals_this_month: Proposal.where('created_at >= ?', Time.current.beginning_of_month).count
    }

    # Priority clients (clients with most proposals, max 6)
    @priority_clients = @clients
      .left_joins(:proposals)
      .group('clients.id')
      .select('clients.*, COUNT(proposals.id) as proposals_count')
      .order('proposals_count DESC')
      .limit(6)

    # Clients that need attention (placeholder logic - could be based on last interaction, sentiment, etc.)
    @needs_attention = @clients.where('updated_at < ?', 7.days.ago).limit(4)
  end
end
