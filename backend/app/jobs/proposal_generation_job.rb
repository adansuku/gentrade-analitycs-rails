# frozen_string_literal: true

class ProposalGenerationJob < ApplicationJob
  queue_as :default

  retry_on StandardError, wait: :polynomially_longer, attempts: 3

  def perform(proposal_id, client_id, material_ids)
    proposal = Proposal.find(proposal_id)
    client = Client.find(client_id)
    materials = client.materials.where(id: material_ids)

    # Update status to generating
    proposal.update!(status: :generating)

    # Generate proposal with AI
    result = Proposals::Generator.new(client, materials).call

    if result[:success]
      # Create first version
      proposal.versions.create!(
        version_number: 1,
        content: result[:content]
      )

      # Update proposal status and metadata
      proposal.update!(
        status: :generated,
        metadata: proposal.metadata.merge(
          ai_usage: result[:usage],
          generated_at: Time.current
        )
      )

      Rails.logger.info "Proposal #{proposal_id} generated successfully"
    else
      # Mark as failed
      proposal.update!(
        status: :draft,
        metadata: proposal.metadata.merge(
          error: result[:error],
          failed_at: Time.current
        )
      )

      Rails.logger.error "Proposal #{proposal_id} generation failed: #{result[:error]}"
    end
  rescue ActiveRecord::RecordNotFound => e
    Rails.logger.error "Record not found: #{e.message}"
    raise # Don't retry on not found
  rescue StandardError => e
    Rails.logger.error "Proposal generation job failed: #{e.message}"
    proposal&.update(status: :draft)
    raise # Retry will happen automatically
  end
end
