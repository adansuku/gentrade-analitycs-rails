module Api
  module V1
    class ReportsController < ApplicationController
      before_action :set_client
      before_action :set_reports_service, except: [:explorer_summary, :explorer_data]

      # GET /api/v1/clients/:client_id/reports/daily
      def daily
        date = params[:date]
        report = @reports_service.daily_report(date)

        render json: report
      end

      # GET /api/v1/clients/:client_id/reports/weekly
      def weekly
        report = @reports_service.weekly_report

        render json: report
      end

      # GET /api/v1/clients/:client_id/reports/monthly
      def monthly
        year_month = params[:year_month]
        report = @reports_service.monthly_report(year_month)

        render json: report
      end

      # POST /api/v1/clients/:client_id/reports/narrative/regenerate
      def regenerate_narrative
        narrative = @reports_service.regenerate_narrative

        if narrative
          render json: { narrative: narrative }
        else
          render json: { error: "No se pudo generar la narrativa. Verifica que haya datos mínimos (ingresos o inversión)." },
                 status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/clients/:client_id/reports/cache
      def clear_cache
        year_month = params[:year_month]
        @reports_service.clear_period_cache(year_month)

        render json: { message: "Caché eliminado para #{year_month || Time.current.strftime('%Y-%m')}" }
      end

      # GET /api/v1/clients/:client_id/reports/objectives
      def objectives
        year_month = params[:year_month] || Time.current.strftime("%Y-%m")
        objectives = @reports_service.get_objectives(year_month)

        render json: { year_month: year_month, objectives: objectives }
      end

      # PUT /api/v1/clients/:client_id/reports/objectives
      def upsert_objectives
        year_month = params[:year_month] || Time.current.strftime("%Y-%m")
        targets = params[:targets] || params[:objectives]
        return render json: { error: "targets es requerido" }, status: :bad_request unless targets

        begin
          result = @reports_service.upsert_objectives(year_month, targets.permit!.to_h)
          render json: { year_month: year_month, objectives: result }
        rescue ArgumentError => e
          render json: { error: e.message }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/clients/:client_id/reports/objectives/copy
      def copy_objectives
        year_month = params[:year_month] || Time.current.strftime("%Y-%m")
        result = @reports_service.copy_objectives(year_month)

        if result
          render json: { year_month: year_month, objectives: result, message: "Objetivos copiados del mes anterior" }
        else
          render json: { error: "No hay objetivos del mes anterior para copiar" }, status: :not_found
        end
      end

      # GET /api/v1/clients/:client_id/reports/costs
      def costs
        year_month = params[:year_month] || Time.current.strftime("%Y-%m")
        costs = @reports_service.get_costs(year_month)

        render json: { year_month: year_month, costs: costs }
      end

      # PUT /api/v1/clients/:client_id/reports/costs
      def upsert_costs
        year_month = params[:year_month] || Time.current.strftime("%Y-%m")
        costs = params[:costs]
        return render json: { error: "costs es requerido" }, status: :bad_request unless costs

        begin
          result = @reports_service.upsert_costs(year_month, costs.permit!.to_h)
          render json: { year_month: year_month, costs: result }
        rescue ArgumentError => e
          render json: { error: e.message }, status: :unprocessable_entity
        end
      end

      # GET /api/v1/clients/:client_id/reports/compare
      def compare
        start_date = params[:start_date]
        end_date = params[:end_date]
        return render json: { error: "start_date y end_date son requeridos" }, status: :bad_request unless start_date && end_date

        comparison = @reports_service.compare_period_yoy(start_date, end_date)

        render json: comparison
      end

      # GET /api/v1/clients/:client_id/reports/insights
      def insights
        year_month = params[:year_month] || Time.current.strftime("%Y-%m")
        objectives = @reports_service.get_objectives(year_month)
        costs = @reports_service.get_costs(year_month)

        render json: {
          year_month: year_month,
          objectives: objectives,
          costs: costs
        }
      end

      # GET /api/v1/clients/:client_id/reports/explorer
      def explorer_summary
        service = ExplorerService.new(@client)
        summary = service.get_explorer_summary

        render json: { integrations: summary }
      end

      # GET /api/v1/clients/:client_id/reports/explorer/data
      def explorer_data
        service = ExplorerService.new(@client)

        unless params[:integration_id]
          return render json: { error: "integration_id es requerido" }, status: :bad_request
        end

        result = service.get_explorer_data(
          integration_id: params[:integration_id].to_i,
          category: params[:category],
          from: params[:from],
          to: params[:to],
          page: (params[:page] || 1).to_i,
          limit: [(params[:limit] || 20).to_i, 100].min
        )

        render json: result
      end

      # GET /api/v1/clients/:client_id/reports/ingestion
      def ingestion_summary
        summary = @reports_service.get_ingestion_summary

        render json: { integrations: summary }
      end

      # DELETE /api/v1/clients/:client_id/reports/integration_data/:integration_id
      def delete_integration_data
        integration_id = params[:integration_id]

        begin
          result = @reports_service.delete_integration_data(integration_id)
          render json: result
        rescue ArgumentError => e
          render json: { error: e.message }, status: :not_found
        end
      end

      # POST /api/v1/clients/:client_id/reports/backfill/:integration_id
      def start_backfill
        integration_id = params[:integration_id]
        result = @reports_service.start_backfill(integration_id)

        if result[:status] == "running"
          render json: result, status: :accepted
        else
          render json: result, status: :unprocessable_entity
        end
      end

      # GET /api/v1/clients/:client_id/reports/backfill/:integration_id/status
      def backfill_status
        integration_id = params[:integration_id]
        status = @reports_service.get_backfill_status(integration_id)

        if status
          render json: status
        else
          render json: { status: "not_found" }, status: :not_found
        end
      end

      private

      def set_client
        @client = Client.find(params[:client_id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Client not found" }, status: :not_found
      end

      def set_reports_service
        @reports_service = ReportsService.new(@client)
      end
    end
  end
end
