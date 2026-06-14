module Api
  module V1
    class InsightsController < ApplicationController
      before_action :set_client

      # GET /api/v1/clients/:client_id/insights
      def index
        service = InsightGeneratorService.new(@client)
        insights = service.get_latest_insights

        if insights
          render json: insights
        else
          render json: { insights: [], date: nil, message: "No hay insights generados. POST para generar." }
        end
      end

      # POST /api/v1/clients/:client_id/insights
      def create
        service = InsightGeneratorService.new(@client)
        insights = service.generate_insights

        if insights
          render json: { insights: insights, date: Date.current }
        else
          render json: { error: "No se pudieron generar insights. Verifica que el cliente tenga integraciones activas con datos." },
                 status: :unprocessable_entity
        end
      end

      private

      def set_client
        @client = Client.find(params[:client_id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Client not found" }, status: :not_found
      end
    end
  end
end
