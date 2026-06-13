# frozen_string_literal: true

module Integrations
  class SlackReporter
    def initialize(integration)
      @integration = integration
      @client = @integration.client
      @messenger = SlackMessenger.new(integration)
    end

    def send_metrics_report(channel:, start_date: nil, end_date: nil)
      start_date ||= 7.days.ago.to_date
      end_date ||= Date.current

      metrics = @client.metrics.for_date_range(start_date, end_date)

      if metrics.empty?
        return @messenger.send_message(
          channel: channel,
          text: "📊 No hay métricas disponibles para #{@client.name} en el período #{start_date} - #{end_date}"
        )
      end

      blocks = build_metrics_report_blocks(metrics, start_date, end_date)

      @messenger.send_message(
        channel: channel,
        blocks: blocks
      )
    end

    def send_daily_summary(channel:)
      date = Date.current
      metrics = @client.metrics.where(date: date)

      if metrics.empty?
        return @messenger.send_message(
          channel: channel,
          text: "📊 No hay métricas disponibles para hoy (#{date})"
        )
      end

      blocks = build_daily_summary_blocks(metrics, date)

      @messenger.send_message(
        channel: channel,
        blocks: blocks
      )
    end

    def send_comparison_report(channel:, period: :week)
      case period
      when :week
        current_start = 1.week.ago.to_date
        previous_start = 2.weeks.ago.to_date
        previous_end = 1.week.ago.to_date - 1.day
      when :month
        current_start = 1.month.ago.to_date
        previous_start = 2.months.ago.to_date
        previous_end = 1.month.ago.to_date - 1.day
      else
        return { success: false, error: 'Invalid period' }
      end

      current_end = Date.current

      current_metrics = @client.metrics.for_date_range(current_start, current_end)
      previous_metrics = @client.metrics.for_date_range(previous_start, previous_end)

      blocks = build_comparison_blocks(
        current_metrics,
        previous_metrics,
        period,
        current_start,
        current_end
      )

      @messenger.send_message(
        channel: channel,
        blocks: blocks
      )
    end

    private

    def build_metrics_report_blocks(metrics, start_date, end_date)
      blocks = []

      # Header
      blocks << {
        type: 'header',
        text: {
          type: 'plain_text',
          text: "📊 Reporte de Métricas - #{@client.name}",
          emoji: true
        }
      }

      blocks << {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: "*Período:* #{format_date(start_date)} - #{format_date(end_date)}"
          }
        ]
      }

      blocks << { type: 'divider' }

      # Group metrics by source
      Metric.sources.keys.each do |source|
        source_metrics = metrics.where(source: source)
        next if source_metrics.empty?

        blocks << {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: "*#{source.to_s.titleize}*"
          }
        }

        # Add metrics for this source
        source_metrics.metric_types.each do |metric_type|
          sum = source_metrics.sum_by_type(metric_type).to_f
          avg = source_metrics.avg_by_type(metric_type).to_f
          count = source_metrics.by_type(metric_type).count

          blocks << {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: "*#{format_metric_name(metric_type)}*"
              },
              {
                type: 'mrkdwn',
                text: format_metric_value(metric_type, sum)
              },
              {
                type: 'mrkdwn',
                text: "Promedio: #{format_metric_value(metric_type, avg)}"
              },
              {
                type: 'mrkdwn',
                text: "Días: #{count}"
              }
            ]
          }
        end

        blocks << { type: 'divider' }
      end

      # Footer
      blocks << {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: "_Generado el #{Time.current.strftime('%d/%m/%Y a las %H:%M')}_"
          }
        ]
      }

      blocks
    end

    def build_daily_summary_blocks(metrics, date)
      blocks = []

      blocks << {
        type: 'header',
        text: {
          type: 'plain_text',
          text: "📅 Resumen Diario - #{format_date(date)}",
          emoji: true
        }
      }

      blocks << {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: "*Cliente:* #{@client.name}"
          }
        ]
      }

      blocks << { type: 'divider' }

      # Group by source
      Metric.sources.keys.each do |source|
        source_metrics = metrics.where(source: source)
        next if source_metrics.empty?

        blocks << {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: "*#{source.to_s.titleize}*"
          }
        }

        fields = []
        source_metrics.metric_types.each do |metric_type|
          value = source_metrics.by_type(metric_type).sum(:value).to_f
          fields << {
            type: 'mrkdwn',
            text: "*#{format_metric_name(metric_type)}:* #{format_metric_value(metric_type, value)}"
          }
        end

        blocks << {
          type: 'section',
          fields: fields
        }

        blocks << { type: 'divider' }
      end

      blocks
    end

    def build_comparison_blocks(current_metrics, previous_metrics, period, start_date, end_date)
      blocks = []

      period_name = period == :week ? 'Semana' : 'Mes'

      blocks << {
        type: 'header',
        text: {
          type: 'plain_text',
          text: "📈 Comparación #{period_name}al - #{@client.name}",
          emoji: true
        }
      }

      blocks << {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: "*Período actual:* #{format_date(start_date)} - #{format_date(end_date)}"
          }
        ]
      }

      blocks << { type: 'divider' }

      # Calculate totals for key metrics
      current_totals = calculate_totals(current_metrics)
      previous_totals = calculate_totals(previous_metrics)

      current_totals.each do |metric_type, current_value|
        previous_value = previous_totals[metric_type] || 0
        change = calculate_percentage_change(previous_value, current_value)
        emoji = change >= 0 ? '📈' : '📉'

        blocks << {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: "*#{format_metric_name(metric_type)}*"
            },
            {
              type: 'mrkdwn',
              text: format_metric_value(metric_type, current_value)
            },
            {
              type: 'mrkdwn',
              text: "#{period_name} anterior: #{format_metric_value(metric_type, previous_value)}"
            },
            {
              type: 'mrkdwn',
              text: "#{emoji} #{change >= 0 ? '+' : ''}#{change.round(1)}%"
            }
          ]
        }
      end

      blocks
    end

    def calculate_totals(metrics)
      totals = {}
      metrics.metric_types.each do |metric_type|
        totals[metric_type] = metrics.by_type(metric_type).sum(:value).to_f
      end
      totals
    end

    def calculate_percentage_change(old_value, new_value)
      return 0 if old_value.zero?
      ((new_value - old_value) / old_value * 100)
    end

    def format_date(date)
      date.strftime('%d/%m/%Y')
    end

    def format_metric_name(metric_type)
      metric_type.to_s.titleize.gsub('_', ' ')
    end

    def format_metric_value(metric_type, value)
      case metric_type.to_s
      when /cost|spend|cpc|cpm|avg_cpc/
        "$#{value.round(2)}"
      when /rate|ctr/
        "#{value.round(2)}%"
      when /duration/
        "#{value.round(0)}s"
      else
        value.to_i.to_s.reverse.gsub(/(\d{3})(?=\d)/, '\\1,').reverse
      end
    end
  end
end
