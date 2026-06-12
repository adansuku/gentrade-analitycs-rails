# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ProposalGenerationJob, type: :job do
  let(:client) { create(:client) }
  let(:materials) { create_list(:client_material, 2, client: client) }
  let(:proposal) { create(:proposal, client: client, status: :generating) }

  describe '#perform' do
    let(:material_ids) { materials.map(&:id) }

    context 'when generation is successful' do
      let(:generator_result) do
        {
          success: true,
          content: '# Propuesta\n\nContenido...',
          usage: { total_tokens: 500 }
        }
      end

      before do
        allow_any_instance_of(Proposals::Generator).to receive(:call).and_return(generator_result)
      end

      it 'creates a proposal version' do
        expect {
          described_class.new.perform(proposal.id, client.id, material_ids)
        }.to change { proposal.versions.count }.by(1)
      end

      it 'updates proposal status to generated' do
        described_class.new.perform(proposal.id, client.id, material_ids)

        expect(proposal.reload.status).to eq('generated')
      end

      it 'stores AI usage in metadata' do
        described_class.new.perform(proposal.id, client.id, material_ids)

        expect(proposal.reload.metadata['ai_usage']).to be_present
        expect(proposal.metadata['ai_usage']['total_tokens']).to eq(500)
      end
    end

    context 'when generation fails' do
      let(:generator_result) do
        {
          success: false,
          error: 'AI generation failed'
        }
      end

      before do
        allow_any_instance_of(Proposals::Generator).to receive(:call).and_return(generator_result)
      end

      it 'updates proposal status to draft' do
        described_class.new.perform(proposal.id, client.id, material_ids)

        expect(proposal.reload.status).to eq('draft')
      end

      it 'stores error in metadata' do
        described_class.new.perform(proposal.id, client.id, material_ids)

        expect(proposal.reload.metadata['error']).to eq('AI generation failed')
      end
    end

    context 'when proposal not found' do
      it 'raises RecordNotFound' do
        expect {
          described_class.new.perform(99999, client.id, material_ids)
        }.to raise_error(ActiveRecord::RecordNotFound)
      end
    end
  end
end
