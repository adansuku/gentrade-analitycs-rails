# frozen_string_literal: true

require 'rails_helper'

RSpec.describe IntegrationSyncJob, type: :job do
  let(:client) { create(:client) }

  describe '#perform' do
    context 'with Google integration' do
      let(:integration) do
        create(
          :integration,
          client: client,
          provider: :google,
          status: :active,
          metadata: {
            'property_id' => '123456',
            'customer_id' => '789012',
            'developer_token' => 'test_token'
          }
        )
      end

      let(:analytics_sync) { instance_double(Integrations::GoogleAnalyticsSync) }
      let(:ads_sync) { instance_double(Integrations::GoogleAdsSync) }

      before do
        allow(Integrations::GoogleAnalyticsSync).to receive(:new).and_return(analytics_sync)
        allow(Integrations::GoogleAdsSync).to receive(:new).and_return(ads_sync)
        allow(analytics_sync).to receive(:call).and_return({ success: true })
        allow(ads_sync).to receive(:call).and_return({ success: true })
      end

      it 'syncs both Google Analytics and Google Ads' do
        described_class.perform_now(integration.id)

        expect(Integrations::GoogleAnalyticsSync).to have_received(:new).with(integration)
        expect(Integrations::GoogleAdsSync).to have_received(:new).with(integration)
        expect(analytics_sync).to have_received(:call)
        expect(ads_sync).to have_received(:call)
      end

      it 'updates integration metadata with sync status' do
        described_class.perform_now(integration.id)

        integration.reload
        expect(integration.metadata['last_sync_at']).not_to be_nil
        expect(integration.metadata['last_sync_status']).to eq('success')
      end

      context 'when only property_id is configured' do
        before do
          integration.update(metadata: { 'property_id' => '123456' })
          allow(Integrations::GoogleAnalyticsSync).to receive(:new).and_return(analytics_sync)
        end

        it 'only syncs Google Analytics' do
          described_class.perform_now(integration.id)

          expect(Integrations::GoogleAnalyticsSync).to have_received(:new)
          expect(Integrations::GoogleAdsSync).not_to have_received(:new)
        end
      end

      context 'when only customer_id is configured' do
        before do
          integration.update(
            metadata: {
              'customer_id' => '789012',
              'developer_token' => 'test_token'
            }
          )
          allow(Integrations::GoogleAdsSync).to receive(:new).and_return(ads_sync)
        end

        it 'only syncs Google Ads' do
          described_class.perform_now(integration.id)

          expect(Integrations::GoogleAdsSync).to have_received(:new)
          expect(Integrations::GoogleAnalyticsSync).not_to have_received(:new)
        end
      end
    end

    context 'with Meta integration' do
      let(:integration) do
        create(
          :integration,
          client: client,
          provider: :meta,
          status: :active,
          metadata: { 'ad_account_id' => 'act_123456' }
        )
      end

      let(:meta_sync) { instance_double(Integrations::MetaAdsSync) }

      before do
        allow(Integrations::MetaAdsSync).to receive(:new).and_return(meta_sync)
        allow(meta_sync).to receive(:call).and_return({ success: true })
      end

      it 'syncs Meta Ads' do
        described_class.perform_now(integration.id)

        expect(Integrations::MetaAdsSync).to have_received(:new).with(integration)
        expect(meta_sync).to have_received(:call)
      end

      it 'updates integration metadata with sync status' do
        described_class.perform_now(integration.id)

        integration.reload
        expect(integration.metadata['last_sync_at']).not_to be_nil
        expect(integration.metadata['last_sync_status']).to eq('success')
      end
    end

    context 'when sync fails' do
      let(:integration) do
        create(
          :integration,
          client: client,
          provider: :meta,
          status: :active,
          metadata: { 'ad_account_id' => 'act_123456' }
        )
      end

      let(:meta_sync) { instance_double(Integrations::MetaAdsSync) }

      before do
        allow(Integrations::MetaAdsSync).to receive(:new).and_return(meta_sync)
        allow(meta_sync).to receive(:call).and_return({
          success: false,
          error: 'API error'
        })
      end

      it 'records the error in metadata' do
        described_class.perform_now(integration.id)

        integration.reload
        expect(integration.metadata['last_sync_status']).to eq('error')
        expect(integration.metadata['last_sync_error']).to eq('API error')
      end
    end

    context 'when integration is not found' do
      it 'logs an error and does not raise' do
        expect(Rails.logger).to receive(:error).with(/not found/)
        described_class.perform_now(999_999)
      end
    end

    context 'when integration is not active' do
      let(:integration) do
        create(
          :integration,
          client: client,
          provider: :google,
          status: :revoked
        )
      end

      it 'logs a warning and skips sync' do
        expect(Rails.logger).to receive(:warn)
        described_class.perform_now(integration.id)
      end
    end
  end
end
