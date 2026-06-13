# frozen_string_literal: true

module Api
  module V1
    class MetricsController < ApplicationController
      before_action :set_client, only: [:index, :sync, :summary]

      # GET /api/v1/clients/:client_id/metrics
      def index
        metrics = @client.metrics
                         .includes(:integration)
                         .order(date: :desc)

        # Filter by source if provided
        metrics = metrics.where(source: params[:source]) if params[:source].present?

        # Filter by metric_type if provided
        metrics = metrics.where(metric_type: params[:metric_type]) if params[:metric_type].present?

        # Filter by date range if provided
        if params[:start_date].present? && params[:end_date].present?
          metrics = metrics.for_date_range(
            Date.parse(params[:start_date]),
            Date.parse(params[:end_date])
          )
        elsif params[:start_date].present?
          metrics = metrics.where('date >= ?', Date.parse(params[:start_date]))
        elsif params[:end_date].present?
          metrics = metrics.where('date <= ?', Date.parse(params[:end_date]))
        end

        # Pagination
        page = params[:page]&.to_i || 1
        per_page = [params[:per_page]&.to_i || 100, 1000].min

        paginated_metrics = metrics.limit(per_page).offset((page - 1) * per_page)

        render json: {
          metrics: paginated_metrics.map { |m| metric_json(m) },
          meta: {
            page: page,
            per_page: per_page,
            total: metrics.count
          }
        }
      end

      # GET /api/v1/clients/:client_id/metrics/summary
      def summary
        start_date = params[:start_date]&.to_date || 30.days.ago.to_date
        end_date = params[:end_date]&.to_date || Date.current

        metrics = @client.metrics.for_date_range(start_date, end_date)

        summary_data = {
          date_range: {
            start: start_date.iso8601,
            end: end_date.iso8601
          },
          by_source: {},
          by_metric_type: {}
        }

        # Group by source
        Metric.sources.keys.each do |source|
          source_metrics = metrics.where(source: source)
          next if source_metrics.empty?

          summary_data[:by_source][source] = {
            total_records: source_metrics.count,
            metric_types: source_metrics.metric_types,
            totals: {}
          }

          # Calculate totals for each metric type
          source_metrics.metric_types.each do |metric_type|
            summary_data[:by_source][source][:totals][metric_type] = {
              sum: source_metrics.sum_by_type(metric_type).to_f,
              avg: source_metrics.avg_by_type(metric_type).to_f.round(2),
              count: source_metrics.by_type(metric_type).count
            }
          end
        end

        # Group by metric type (across all sources)
        metrics.metric_types.each do |metric_type|
          type_metrics = metrics.by_type(metric_type)
          summary_data[:by_metric_type][metric_type] = {
            sum: type_metrics.sum(:value).to_f,
            avg: type_metrics.average(:value).to_f.round(2),
            count: type_metrics.count
          }
        end

        render json: summary_data
      end

      # POST /api/v1/clients/:client_id/metrics/sync
      def sync
        integration_id = params[:integration_id]

        if integration_id.present?
          integration = @client.integrations.find(integration_id)
          IntegrationSyncJob.perform_later(
            integration.id,
            start_date: params[:start_date],
            end_date: params[:end_date]
          )

          render json: {
            message: "Sync started for integration #{integration.provider_name}",
            integration_id: integration.id,
            status: 'processing'
          }, status: :accepted
        else
          # Sync all client integrations
          @client.integrations.active.each do |integration|
            IntegrationSyncJob.perform_later(
              integration.id,
              start_date: params[:start_date],
              end_date: params[:end_date]
            )
          end

          render json: {
            message: "Sync started for #{@client.integrations.active.count} integration(s)",
            status: 'processing'
          }, status: :accepted
        end
      rescue ActiveRecord::RecordNotFound => e
        render json: { error: e.message }, status: :not_found
      end

      private

      def set_client
        @client = Client.find(params[:client_id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Client not found' }, status: :not_found
      end

      def metric_json(metric)
        {
          id: metric.id,
          client_id: metric.client_id,
          integration_id: metric.integration_id,
          source: metric.source,
          source_name: metric.source_name,
          metric_type: metric.metric_type,
          value: metric.value.to_f,
          date: metric.date.iso8601,
          metadata: metric.metadata,
          created_at: metric.created_at.iso8601,
          integration: {
            id: metric.integration.id,
            provider: metric.integration.provider,
            provider_name: metric.integration.provider_name,
            status: metric.integration.status
          }
        }
      end
    end
  end
end
