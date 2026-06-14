class InsightGeneratorService
  INSIGHT_SYSTEM = <<~PROMPT.freeze
    Eres un analista de marketing digital senior. Generas insights accionables para account managers de agencia.

    Responde SOLO con un JSON array de exactamente 3 insights. Cada insight:
    {
      "title": "Título corto (max 60 chars)",
      "description": "Qué está pasando y por qué importa (1-2 frases)",
      "recommendation": "Qué hacer al respecto (1 frase concreta)",
      "severity": "high | medium | low",
      "dataPoints": ["dato1", "dato2"]
    }

    Prioriza por impacto en revenue. Severity high = acción urgente, medium = revisar esta semana, low = oportunidad.
  PROMPT

  def initialize(client)
    @client = client
  end

  def generate_insights
    integrations = @client.integrations.active.select(:id, :provider)
    return nil if integrations.empty?

    integration_ids = integrations.map(&:id)
    today = Date.current
    year_month = today.strftime("%Y-%m")
    month_start = "#{year_month}-01"
    today_iso = today.to_s
    period_key = "#{month_start}_#{today_iso}"

    period_summaries = IntegrationDatum.where(
      integration_id: integration_ids, category: "period_summary", period: period_key
    ).includes(:integration).order(fetched_at: :desc)

    have_month_data = period_summaries.any?
    summaries = have_month_data ? period_summaries : IntegrationDatum.where(
      integration_id: integration_ids, category: "summary"
    ).includes(:integration).order(fetched_at: :desc)

    period_campaigns = IntegrationDatum.where(
      integration_id: integration_ids, category: "campaigns", period: period_key
    ).includes(:integration).order(fetched_at: :desc)

    campaigns_are_month = period_campaigns.any?
    campaigns = campaigns_are_month ? period_campaigns : IntegrationDatum.where(
      integration_id: integration_ids, category: "campaigns"
    ).includes(:integration).order(fetched_at: :desc)

    objectives = @client.report_objectives.find_by(year_month: year_month)

    prompt = "Cliente: #{@client.name || 'Desconocido'}\nMes: #{year_month}\n\n"
    prompt += "=== MÉTRICAS #{have_month_data ? 'MES EN CURSO (' + period_key + ')' : 'ÚLTIMOS 30 DÍAS'} ===\n"
    total_revenue = 0.0
    total_ad_spend = 0.0

    summaries.each do |s|
      prompt += "[#{s.integration.provider}] "
      data = s.data
      if data["revenue_this_month"].present?
        prompt += "Revenue: #{data['revenue_this_month']}€ "
        total_revenue += data["revenue_this_month"].to_f
      elsif data["total_revenue"].present?
        prompt += "Revenue: #{data['total_revenue']}€ "
        total_revenue += data["total_revenue"].to_f
      end
      if data["total_spend"].present?
        prompt += "Spend: #{data['total_spend']}€ "
        total_ad_spend += data["total_spend"].to_f
      elsif data["totalSpend"].present?
        prompt += "Spend: #{data['totalSpend']}€ "
        total_ad_spend += data["totalSpend"].to_f
      end
      if data.dig("current", "sessions").present?
        prompt += "Sessions: #{data['current']['sessions']} "
      elsif data["sessions"].present?
        prompt += "Sessions: #{data['sessions']} "
      end
      prompt += "\n"
    end

    real_roas = total_ad_spend > 0 ? (total_revenue / total_ad_spend).round(2) : 0
    prompt += "\nROAS REAL #{have_month_data ? 'del mes en curso' : '(últimos 30d)'}: #{real_roas} (revenue #{total_revenue.round(2)}€ / gasto #{total_ad_spend.round(2)}€)\n"
    prompt += "IMPORTANTE: Usa siempre este ROAS real (#{real_roas}), NO el ROAS que reporta Google Ads o Meta — esos están inflados por atribución multi-touch.\n"

    if objectives&.targets.present?
      prompt += "\n=== OBJETIVOS ===\n"
      prompt += "Revenue objetivo: #{objectives.targets['revenue']}€\n" if objectives.targets["revenue"]
      prompt += "ROAS objetivo: #{objectives.targets['roas']}\n" if objectives.targets["roas"]
      days_in_month = Time.days_in_month(today.month, today.year)
      prompt += "Progreso del mes: día #{today.day} de #{days_in_month} (#{(today.day.to_f / days_in_month * 100).round}%)\n"
    end

    if campaigns.any?
      prompt += "\n=== TOP CAMPAÑAS POR GASTO #{campaigns_are_month ? '(MES EN CURSO)' : '(ÚLTIMOS 30 DÍAS)'} ===\n"
      all_campaigns = campaigns.flat_map do |c|
        next [] unless c.data.is_a?(Array)
        c.data.map { |d| d.merge("platform" => c.integration.provider) }
      end
      sorted = all_campaigns.sort_by { |c| -(c["spend"].to_f || 0) }.first(10)
      sorted.each do |c|
        prompt += "[#{c['platform']}] #{c['name']}: spend #{c['spend'].to_f.round(2)}€"
        prompt += ", conv: #{c['conversions']}" if c["conversions"]
        prompt += ", clicks: #{c['clicks']}" if c["clicks"]
        prompt += "\n"
      end
    end

    prompt += "\nGenera 3 insights accionables en JSON:"

    begin
      client = AI::OpenrouterClient.new(model: ENV.fetch("LLM_MODEL_FAST", "anthropic/claude-3.5-haiku"))
      result = client.generate_completion(
        system_prompt: INSIGHT_SYSTEM,
        prompt: prompt,
        max_tokens: 800,
        temperature: 0.7
      )

      return nil unless result[:success]

      raw = result[:content]
                    .gsub(/```json\s*/, "")
                    .gsub(/```\s*/, "")
                    .strip

      insights = JSON.parse(raw)
      return nil unless insights.is_a?(Array)

      today_date = Date.current
      snapshot = @client.daily_snapshots.find_or_initialize_by(date: today_date)
      snapshot.update!(stats: snapshot.stats.presence || {}, insights: insights)

      insights
    rescue => e
      Rails.logger.warn "Insight generation failed for client #{@client.id}: #{e.message}"
      nil
    end
  end

  def get_latest_insights
    snapshot = @client.daily_snapshots.where.not(insights: nil).order(date: :desc).first
    return nil unless snapshot

    { insights: snapshot.insights, date: snapshot.date }
  end
end
