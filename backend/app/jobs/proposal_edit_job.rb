# frozen_string_literal: true

class ProposalEditJob < ApplicationJob
  queue_as :default

  retry_on StandardError, wait: :polynomially_longer, attempts: 3

  def perform(proposal_id, message_id, user_message)
    proposal = Proposal.find(proposal_id)
    message = ProposalMessage.find(message_id)

    # Edit proposal with AI
    result = Proposals::Editor.new(proposal, user_message).call

    if result[:success]
      # Save assistant message
      proposal.messages.create!(
        role: 'assistant',
        content: "Propuesta actualizada"
      )

      # Create new version with edited content
      current_version = proposal.current_version
      new_version_number = current_version ? current_version.version_number + 1 : 1

      proposal.versions.create!(
        version_number: new_version_number,
        content: result[:content]
      )

      # Update metadata with AI usage
      proposal.update!(
        metadata: proposal.metadata.merge(
          last_ai_usage: result[:usage],
          last_edited_at: Time.current
        )
      )

      Rails.logger.info "Proposal #{proposal_id} edited successfully"
    else
      # Mark message with error
      message.update!(
        metadata: { error: result[:error], failed_at: Time.current }
      )

      Rails.logger.error "Proposal #{proposal_id} edit failed: #{result[:error]}"
    end
  rescue ActiveRecord::RecordNotFound => e
    Rails.logger.error "Record not found: #{e.message}"
    raise # Don't retry on not found
  rescue StandardError => e
    Rails.logger.error "Proposal edit job failed: #{e.message}"
    raise # Retry will happen automatically
  end
end
