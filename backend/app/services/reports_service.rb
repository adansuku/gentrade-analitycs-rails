class ReportsService
  ECOMMERCE_TYPES = %w[shopify woocommerce prestashop amazon_seller stripe].freeze
  AD_TYPES = %w[meta_ads google_ads tiktok_ads].freeze
  ANALYTICS_TYPES = %w[google_analytics].freeze
  ALL_REPORT_TYPES = ECOMMERCE_TYPES + AD_TYPES + ANALYTICS_TYPES
  BACKFILL_CAPABLE_TYPES = %w[shopify meta].freeze

  CONNECTOR_MAP = {
    'shopify' => 'Integrations::ShopifySync',
    'meta' => 'Integrations::MetaAdsSync'
  }.freeze

  def initialize(client)
    @client = client
  end

  def daily_report(requested_date = nil)
    yesterday = Date.current - 1
    date = requested_date.presence || yesterday.to_s
    check_and_trigger_auto_backfill
    build_report(start_date: date, end_date: date)
  end

  def weekly_report
    yesterday = Date.current - 1
    monday = yesterday.beginning_of_week(:monday)
    check_and_trigger_auto_backfill
    build_report(start_date: monday.to_s, end_date: yesterday.to_s)
  end

  def monthly_report(requested_year_month = nil)
    today = Date.current
    current_ym = today.strftime("%Y-%m")
    year_month = requested_year_month.presence || current_ym
    is_past_month = year_month < current_ym

    if is_past_month
      row = @client.report_objectives.find_by(year_month: year_month)
      if row&.snapshot.present?
        snapshot = row.snapshot
        metrics = snapshot["metrics"] || { "revenue" => nil, "ad_spend" => nil, "roas" => nil, "sessions" => nil }
        end_date = last_day_of_month(year_month)

        return {
          period: { year_month: year_month, start: "#{year_month}-01", end: end_date },
          sources: snapshot["sources"] || [],
          metrics: metrics,
          objectives: row.targets.present? ? build_pace_signals(row.targets, metrics, Date.parse(end_date)) : nil,
          investment: snapshot["investment"] || build_investment_breakdown(metrics, row.costs, Date.parse(end_date)),
          campaigns: snapshot["campaigns"] || [],
          channels: snapshot["channels"] || nil,
          funnel: snapshot["funnel"] || nil,
          shopify_discounts: snapshot["shopify_discounts"] || nil,
          yoy: snapshot["yoy"] || nil,
          narrative: row.narrative || nil,
          frozen: true
        }
      end
    end

    check_and_trigger_auto_backfill

    start_date = "#{year_month}-01"
    yesterday = Date.current - 1
    end_date = is_past_month ? last_day_of_month(year_month) : yesterday.to_s
    report = build_report(start_date: start_date, end_date: end_date, year_month: year_month)

    objectives = get_objectives(year_month)
    date_for_pace = is_past_month ? Date.parse("#{last_day_of_month(year_month)}T23:59:59") : yesterday
    report[:objectives] = objectives ? build_pace_signals(objectives, report[:metrics], date_for_pace) : nil

    costs = get_costs(year_month)
    report[:investment] = build_investment_breakdown(report[:metrics], costs, date_for_pace)
    report[:costs] = costs

    period_key = "#{start_date}_#{end_date}"
    report[:campaigns] = get_campaign_data(period_key)
    report[:channels] = get_channel_breakdown(start_date, end_date)
    report[:funnel] = get_funnel_metrics(start_date, end_date)
    report[:yoy] = build_yoy(year_month, report[:metrics], start_date, end_date)
    report[:shopify_discounts] = get_shopify_discounts(start_date, end_date)
    enrich_campaign_keywords(report[:campaigns])

    narrative_ctx = {
      investment: report[:investment], yoy: report[:yoy], client_name: @client.name,
      funnel: report[:funnel], shopify_discounts: report[:shopify_discounts]
    }
    report[:narrative] = get_cached_narrative(year_month, report[:metrics], report[:objectives], narrative_ctx)

    if is_past_month
      save_snapshot(year_month, report)
    end

    report
  end

  def regenerate_narrative
    today = Date.current
    year_month = today.strftime("%Y-%m")

    row = @client.report_objectives.find_by(year_month: year_month)
    row&.update!(narrative: nil)

    start_date = "#{year_month}-01"
    end_date = today.to_s
    report = build_report(start_date: start_date, end_date: end_date, year_month: year_month)
    objectives = get_objectives(year_month)
    built_objectives = objectives ? build_pace_signals(objectives, report[:metrics], today) : nil
    costs = get_costs(year_month)
    investment = build_investment_breakdown(report[:metrics], costs, today)
    yoy = build_yoy(year_month, report[:metrics], start_date, end_date)
    funnel = get_funnel_metrics(start_date, end_date)
    shopify_discounts = get_shopify_discounts(start_date, end_date)

    narrative = generate_narrative(
      report[:metrics], built_objectives, year_month,
      investment: investment, yoy: yoy, client_name: @client.name,
      funnel: funnel, shopify_discounts: shopify_discounts
    )

    if narrative
      obj = @client.report_objectives.find_or_initialize_by(year_month: year_month)
      obj.update!(narrative: narrative, targets: obj.targets || {})
    end

    narrative
  end

  def clear_period_cache(requested_year_month = nil)
    today = Date.current
    current_ym = today.strftime("%Y-%m")
    year_month = requested_year_month.presence || current_ym
    is_past_month = year_month < current_ym

    start_date = "#{year_month}-01"
    end_date = is_past_month ? last_day_of_month(year_month) : today.to_s
    period_key = "#{start_date}_#{end_date}"

    integration_ids = @client.integrations.active.pluck(:id)
    IntegrationDatum.where(integration_id: integration_ids, category: "period_summary", period: period_key).destroy_all

    existing = @client.report_objectives.find_by(year_month: year_month)
    if existing
      existing.update!(snapshot: nil, narrative: nil)
    end
  end

  def compare_period_yoy(start_date, end_date)
    current = build_report(start_date: start_date, end_date: end_date)

    prev_start = shift_year(start_date, -1)
    prev_end = shift_year(end_date, -1)
    previous = build_report(start_date: prev_start, end_date: prev_end)

    current_channels = get_channel_breakdown(start_date, end_date)
    previous_channels = get_channel_breakdown(prev_start, prev_end)

    comparison = {
      period: {
        current: { start: start_date, end: end_date },
        previous: { start: prev_start, end: prev_end }
      },
      metrics: {},
      channels: nil
    }

    c_rev = current.dig(:metrics, :revenue, :value) || 0
    p_rev = previous.dig(:metrics, :revenue, :value) || 0
    comparison[:metrics][:revenue] = { current: c_rev, previous: p_rev, change: delta(c_rev, p_rev) } if c_rev > 0 || p_rev > 0

    c_ad = current.dig(:metrics, :ad_spend, :total) || 0
    p_ad = previous.dig(:metrics, :ad_spend, :total) || 0
    comparison[:metrics][:ad_spend] = { current: c_ad, previous: p_ad, change: delta(c_ad, p_ad) } if c_ad > 0 || p_ad > 0

    c_ses = current.dig(:metrics, :sessions, :value) || 0
    p_ses = previous.dig(:metrics, :sessions, :value) || 0
    comparison[:metrics][:sessions] = { current: c_ses, previous: p_ses, change: delta(c_ses, p_ses) } if c_ses > 0 || p_ses > 0

    c_roas = current.dig(:metrics, :roas, :value)
    p_roas = previous.dig(:metrics, :roas, :value)
    comparison[:metrics][:roas] = { current: c_roas || 0, previous: p_roas || 0, change: delta(c_roas || 0, p_roas || 0) } if c_roas || p_roas

    if current_channels && previous_channels
      prev_map = previous_channels.index_by { |ch| ch["channel"] }
      comparison[:channels] = current_channels.map do |ch|
        prev = prev_map[ch["channel"]]
        {
          channel: ch["channel"],
          sessions: { current: ch["sessions"], previous: prev&.dig("sessions") || 0, change: delta(ch["sessions"], prev&.dig("sessions") || 0) },
          conversions: { current: ch["conversions"], previous: prev&.dig("conversions") || 0, change: delta(ch["conversions"], prev&.dig("conversions") || 0) }
        }
      end
    end

    comparison
  end

  def get_objectives(year_month)
    row = @client.report_objectives.find_by(year_month: year_month)
    row&.targets
  end

  def upsert_objectives(year_month, targets)
    validate_targets!(targets)
    row = @client.report_objectives.find_or_initialize_by(year_month: year_month)
    row.update!(targets: targets)
    row.targets
  end

  def copy_objectives(year_month)
    year, month = year_month.split("-").map(&:to_i)
    month -= 1
    if month == 0
      month = 12
      year -= 1
    end
    prev_ym = format("%<year>04d-%<month>02d", year: year, month: month)

    prev = @client.report_objectives.find_by(year_month: prev_ym)
    return nil unless prev

    upsert_objectives(year_month, prev.targets)
  end

  def get_costs(year_month)
    row = @client.report_objectives.find_by(year_month: year_month)
    row&.costs
  end

  def upsert_costs(year_month, costs)
    raise ArgumentError, "costs must be a Hash" unless costs.is_a?(Hash)
    if costs["fee_percent"] && (costs["fee_percent"] < 0 || costs["fee_percent"] > 100)
      raise ArgumentError, "fee_percent must be between 0 and 100"
    end
    if costs["fixed_costs"] && !costs["fixed_costs"].is_a?(Array)
      raise ArgumentError, "fixed_costs must be an array"
    end

    row = @client.report_objectives.find_or_initialize_by(year_month: year_month)
    row.update!(costs: costs)
    row.costs
  end

  def get_ingestion_summary
    @client.integrations.map do |integ|
      data_points = integ.data_points.order(fetched_at: :asc)
      record_count = data_points.size
      earliest = data_points.first&.fetched_at
      latest = data_points.last&.fetched_at

      {
        integration_id: integ.id,
        type: integ.provider,
        status: integ.status,
        last_sync_at: integ.metadata&.dig("last_sync_at"),
        last_error: integ.metadata&.dig("last_error"),
        record_count: record_count,
        date_range: record_count > 0 ? { earliest: earliest&.to_date&.to_s, latest: latest&.to_date&.to_s } : nil
      }
    end
  end

  def delete_integration_data(integration_id)
    integ = @client.integrations.find_by(id: integration_id)
    raise ArgumentError, "Integration not found for this client" unless integ

    count = integ.data_points.count
    integ.data_points.destroy_all
    { deleted: count }
  end

  def start_backfill(integration_id, auto: false)
    integ = @client.integrations.find_by(id: integration_id)
    return { status: "error", error: "Integration not found" } unless integ

    state = Rails.cache.read("backfill_#{integration_id}")
    return state if state&.dig("status") == "running"

    state = { status: "running", progress: 0, started_at: Time.current.iso8601, error: nil, auto: auto }
    Rails.cache.write("backfill_#{integration_id}", state)

    BackfillJob.perform_later(integration_id, auto: auto)

    state
  end

  def get_backfill_status(integration_id)
    state = Rails.cache.read("backfill_#{integration_id}")
    return nil unless state

    if state["auto"] && state["status"] == "failed"
      return nil
    end
    state
  end

  private

  def get_client_integrations
    @client.integrations.active.select(:id, :provider, :metadata)
  end

  # Maps an Integration's OAuth provider + metadata config to one or more
  # connector "types" (matching the original Node.js per-connector model),
  # used to classify data against ECOMMERCE_TYPES/AD_TYPES/ANALYTICS_TYPES.
  def integration_types(integration)
    case integration.provider
    when "shopify"
      ["shopify"]
    when "meta"
      ["meta_ads"]
    when "google"
      types = []
      types << "google_analytics" if integration.metadata&.dig("property_id").present?
      types << "google_ads" if integration.metadata&.dig("ads_customer_id").present?
      types
    else
      []
    end
  end

  def build_report(start_date:, end_date:, year_month: nil)
    integrations = get_client_integrations
    connected_types = integrations.flat_map { |i| integration_types(i) }
    missing = build_missing_list(connected_types)

    if integrations.empty?
      return {
        period: year_month ? { year_month: year_month, start: start_date, end: end_date } : { start: start_date, end: end_date },
        sources: [],
        metrics: { revenue: nil, ad_spend: nil, roas: nil, sessions: nil },
        missing: missing
      }
    end

    generic_summaries = get_integration_summaries(integrations.map(&:id))
    period_summaries = fetch_period_data(integrations, start_date, end_date)

    period_by_integration = period_summaries.each_with_object({}) { |s, h| h[s.integration_id] = s }
    is_monthly = year_month.present?

    period_revenue = extract_revenue(period_summaries)
    generic_revenue = extract_revenue(generic_summaries)
    period_ad_spend = extract_ad_spend(period_summaries)
    generic_ad_spend = extract_ad_spend(generic_summaries)

    revenue = is_monthly ? (period_revenue || generic_revenue) : (period_revenue || nil)
    ad_spend = is_monthly ? (period_ad_spend || generic_ad_spend) : (period_ad_spend || nil)

    sessions = nil
    ga_period = period_summaries.find { |s| integration_types(s.integration).any? { |t| ANALYTICS_TYPES.include?(t) } && s.data["sessions"].present? }
    if ga_period
      sessions = { value: ga_period.data["sessions"].to_f }
    else
      sessions = extract_sessions(generic_summaries)
      unless sessions
        ga_ids = integrations.select { |i| integration_types(i).any? { |t| ANALYTICS_TYPES.include?(t) } }.map(&:id)
        if ga_ids.any?
          metrics_row = IntegrationDatum.where(integration_id: ga_ids, category: "metrics").order(fetched_at: :desc).first
          if metrics_row&.data&.dig("current", "sessions")
            sessions = { value: metrics_row.data["current"]["sessions"].to_f }
          end
        end
      end
    end

    revenue_is_period = period_revenue.present?
    ad_spend_is_period = period_ad_spend.present?
    roas_consistent = revenue_is_period == ad_spend_is_period
    roas = roas_consistent ? calculate_roas(revenue, ad_spend) : nil

    {
      period: year_month ? { year_month: year_month, start: start_date, end: end_date } : { start: start_date, end: end_date },
      sources: build_sources(integrations),
      metrics: { revenue: revenue, ad_spend: ad_spend, roas: roas, sessions: sessions },
      missing: missing
    }
  end

  def get_integration_summaries(integration_ids)
    IntegrationDatum.where(integration_id: integration_ids, category: "summary")
                    .includes(:integration)
                    .order(fetched_at: :desc)
  end

  def fetch_period_data(integrations, start_date, end_date)
    period_key = "#{start_date}_#{end_date}"
    integration_ids = integrations.map(&:id)

    cached = IntegrationDatum.where(
      integration_id: integration_ids,
      category: "period_summary",
      period: period_key
    ).includes(:integration)

    cached_ids = cached.map(&:integration_id).to_set
    uncached = integrations.reject { |i| cached_ids.include?(i.id) && CONNECTOR_MAP.key?(i.provider) }

    uncached.each do |integ|
      next unless CONNECTOR_MAP.key?(integ.provider)
      begin
        klass = CONNECTOR_MAP[integ.provider].constantize
        service = klass.new(integ)
        service.call(start_date: Date.parse(start_date), end_date: Date.parse(end_date))
      rescue => e
        Rails.logger.warn "Period fetch failed for #{integ.provider}: #{e.message}"
      end
    end

    IntegrationDatum.where(
      integration_id: integration_ids,
      category: "period_summary",
      period: period_key
    ).includes(:integration).order(fetched_at: :desc).uniq { |d| d.integration_id }
  end

  def build_missing_list(connected_types)
    missing = []
    missing << "shopify" unless connected_types.any? { |t| ECOMMERCE_TYPES.include?(t) }
    missing << "meta_ads" unless connected_types.any? { |t| AD_TYPES.include?(t) }
    missing << "google_analytics" unless connected_types.any? { |t| ANALYTICS_TYPES.include?(t) }
    missing
  end

  def extract_revenue(summaries)
    summaries.each do |s|
      next unless integration_types(s.integration).any? { |t| ECOMMERCE_TYPES.include?(t) }

      data = s.data
      value = data["revenue_this_month"] || data["total_revenue"] || data["revenueThisMonth"] || data["totalRevenue"]
      if value.present?
        return { value: value.to_f, currency: data["currency"] || "EUR" }
      end
    end
    nil
  end

  def extract_ad_spend(summaries)
    platforms = {}
    total = 0.0
    leads_only = 0.0
    found = false

    summaries.each do |s|
      type = integration_types(s.integration).find { |t| AD_TYPES.include?(t) }
      next unless type

      data = s.data
      spend = data["total_spend"] || data["totalSpend"]
      next unless spend.present?

      key = type.gsub("_ads", "").gsub("_", "")
      platforms[key] = spend.to_f
      total += spend.to_f
      leads_only += (data["leads_only_spend"] || data["leadsOnlySpend"] || 0).to_f if type == "meta_ads"
      found = true
    end

    return nil unless found
    platforms["total"] = total
    platforms["leads_only"] = leads_only
    platforms
  end

  def extract_sessions(summaries)
    summaries.each do |s|
      next unless integration_types(s.integration).any? { |t| ANALYTICS_TYPES.include?(t) }

      data = s.data
      sessions = data.dig("current", "sessions") || data["sessions"]
      return { value: sessions.to_f } if sessions.present?
    end
    nil
  end

  def calculate_roas(revenue, ad_spend)
    return nil unless revenue && ad_spend && ad_spend["total"].to_f > 0
    { value: (revenue[:value].to_f / ad_spend["total"].to_f).round(2) }
  end

  def build_sources(integrations)
    integrations.map do |i|
      {
        integration_id: i.id,
        name: i.provider,
        last_sync_at: i.metadata&.dig("last_sync_at")
      }
    end
  end

  def get_channel_breakdown(start_date, end_date)
    ga_integration = @client.integrations.active.find_by(provider: :google)
    return nil unless ga_integration&.metadata&.dig("property_id")

    begin
      service = Integrations::GoogleAnalyticsSync.new(ga_integration)
      service.fetch_channel_breakdown(start_date, end_date)
    rescue => e
      Rails.logger.warn "Channel breakdown failed: #{e.message}"
      nil
    end
  end

  def get_funnel_metrics(start_date, end_date)
    ga = @client.integrations.active.find_by(provider: :google)
    meta = @client.integrations.active.find_by(provider: :meta)

    ecommerce = nil
    if ga&.metadata&.dig("property_id")
      begin
        service = Integrations::GoogleAnalyticsSync.new(ga)
        ecommerce = service.fetch_ecommerce_events(start_date, end_date)
      rescue => e
        Rails.logger.warn "Ecommerce events failed: #{e.message}"
      end
    end

    leads = nil
    cpl = nil
    if meta
      period_key = "#{start_date}_#{end_date}"
      meta_data = IntegrationDatum.where(integration_id: meta.id, category: "period_summary", period: period_key).first
      meta_data ||= IntegrationDatum.where(integration_id: meta.id, category: "summary").order(fetched_at: :desc).first

      if meta_data&.data && meta_data.data["total_leads"].to_i > 0
        leads = meta_data.data["total_leads"].to_i
        cpl = meta_data.data["leads_only_cpl"] if meta_data.data["leads_only_spend"].to_f > 0
      end
    end

    return nil if !ecommerce&.dig("has_data") && leads.nil?

    {
      views: ecommerce&.dig("views"),
      carts: ecommerce&.dig("carts"),
      checkouts: ecommerce&.dig("checkouts"),
      orders: ecommerce&.dig("orders"),
      cart_close_rate: ecommerce && ecommerce["carts"].to_f > 0 && ecommerce["orders"] ? (ecommerce["orders"].to_f / ecommerce["carts"].to_f * 100).round(1) : nil,
      checkout_completion_rate: ecommerce && ecommerce["checkouts"].to_f > 0 && ecommerce["orders"] ? (ecommerce["orders"].to_f / ecommerce["checkouts"].to_f * 100).round(1) : nil,
      leads: leads,
      cpl: cpl
    }
  end

  def get_campaign_data(period_key = nil)
    integrations = @client.integrations.active.where(provider: %i[meta google shopify])
    campaigns = []

    integrations.each do |integ|
      data = nil
      if period_key
        data = IntegrationDatum.where(integration_id: integ.id, category: "campaigns", period: period_key).order(fetched_at: :desc).first
      end
      data ||= IntegrationDatum.where(integration_id: integ.id, category: "campaigns").order(fetched_at: :desc).first

      next unless data&.data && data.data.is_a?(Array)

      data.data.each do |c|
        next unless c["spend"].to_f > 0
        campaigns << c.merge("platform" => integ.provider)
      end
    end

    campaigns
  end

  def get_shopify_discounts(start_date, end_date)
    shopify = @client.integrations.active.find_by(provider: :shopify)
    return nil unless shopify

    period_key = "#{start_date}_#{end_date}"
    data = IntegrationDatum.where(integration_id: shopify.id, category: "period_summary", period: period_key).first
    sales_breakdown = data&.data&.dig("sales_breakdown")
    return nil unless sales_breakdown

    gross_sales = sales_breakdown["gross_sales"].to_f
    discounts = sales_breakdown["discounts"].to_f.abs
    net_sales = sales_breakdown["net_sales"].to_f
    returns = sales_breakdown["returns"].to_f.abs

    {
      total_discounts: discounts.round(2),
      discount_pct: gross_sales > 0 ? (discounts / gross_sales * 100).round(2) : 0,
      gross_sales: gross_sales.round(2),
      net_sales: net_sales.round(2),
      returns: returns.round(2),
      returns_pct: gross_sales > 0 ? (returns / gross_sales * 100).round(2) : 0
    }
  end

  def enrich_campaign_keywords(campaigns)
    return unless campaigns
    brand_patterns = [/\b(marca|brand)\b/i, /\bf1\b/i, /\bsea\b/i]
    campaigns.each do |c|
      c["brand_campaign"] = brand_patterns.any? { |p| p.match?(c["name"].to_s) }
    end
  end

  def build_pace_signals(targets, metrics, today)
    return nil unless targets.present? && today

    days_in_month = Time.days_in_month(today.month, today.year)
    days_elapsed = today.day
    pace_expected = ((days_elapsed.to_f / days_in_month) * 100).round

    result = {}

    if targets["revenue"].present? && metrics[:revenue]
      pace_actual = ((metrics[:revenue][:value].to_f / targets["revenue"].to_f) * 100).round
      result["revenue"] = {
        target: targets["revenue"],
        actual: metrics[:revenue][:value],
        pace_expected: pace_expected,
        pace_actual: pace_actual,
        status: pace_status(pace_actual, pace_expected)
      }
    end

    if targets["roas"].present? && metrics[:roas]
      pace_actual = ((metrics[:roas][:value].to_f / targets["roas"].to_f) * 100).round
      result["roas"] = {
        target: targets["roas"],
        actual: metrics[:roas][:value],
        pace_expected: pace_expected,
        pace_actual: pace_actual,
        status: pace_status(pace_actual, pace_expected)
      }
    end

    if targets["ad_spend"].present? && metrics[:ad_spend]
      result["ad_spend"] = {}
      targets["ad_spend"].each do |platform, budget|
        spent = metrics[:ad_spend][platform]
        next unless spent.present? && budget.to_f > 0

        pace_actual = ((spent.to_f / budget.to_f) * 100).round
        result["ad_spend"][platform] = {
          budget: budget,
          spent: spent,
          pace_expected: pace_expected,
          pace_actual: pace_actual,
          status: pace_status(pace_actual, pace_expected)
        }
      end
    end

    result.presence
  end

  def pace_status(actual, expected)
    return "ahead" if actual >= expected + 5
    return "behind" if actual < expected - 5
    "on_track"
  end

  def build_investment_breakdown(metrics, costs, today)
    return nil unless costs

    days_in_month = Time.days_in_month(today.month, today.year)
    days_elapsed = today.day
    proration_factor = days_elapsed.to_f / days_in_month

    breakdown = { platforms: {}, fixed_costs: [], fee: nil, total: nil }
    total_ad_spend = 0.0
    leads_only = (metrics.dig(:ad_spend, "leads_only") || 0).to_f

    if metrics[:ad_spend]
      metrics[:ad_spend].each do |platform, spent|
        next if %w[total leads_only].include?(platform)

        display_spent = platform == "meta" ? [spent.to_f - leads_only, 0].max : spent.to_f
        breakdown[:platforms][platform] = {
          spent: display_spent.round(2)
        }
        total_ad_spend += spent.to_f
      end
    end

    ad_spend_for_total = total_ad_spend - leads_only
    total_fixed_costs = 0.0
    fee_base_fixed_costs = 0.0

    if costs["fixed_costs"].is_a?(Array)
      costs["fixed_costs"].each do |fc|
        prorated = (fc["monthly"].to_f * proration_factor).round(2)
        include_in_fee_base = fc.fetch("include_in_fee_base", true)
        breakdown[:fixed_costs] << {
          name: fc["name"],
          monthly: fc["monthly"],
          prorated: prorated,
          include_in_fee_base: include_in_fee_base
        }
        total_fixed_costs += prorated
        fee_base_fixed_costs += prorated if include_in_fee_base
      end
    end

    fee_base = total_ad_spend + fee_base_fixed_costs
    fee_percent = costs["fee_percent"].to_f
    fee_amount = (fee_base * (fee_percent / 100.0)).round(2)
    fee_monthly_budget = costs["fee_monthly_budget"]

    breakdown[:fee] = {
      percent: fee_percent,
      amount: fee_amount,
      budget: fee_monthly_budget
    }

    total_spent = ad_spend_for_total + total_fixed_costs + fee_amount
    total_budget = costs["total_budget"]
    breakdown[:total] = {
      spent: total_spent.round(2),
      budget: total_budget,
      pct_consumed: total_budget.to_f > 0 ? ((total_spent / total_budget.to_f) * 100).round : nil
    }

    revenue = metrics.dig(:revenue, :value).to_f
    breakdown[:roas_net] = total_spent > 0 ? (revenue / total_spent).round(2) : nil

    breakdown
  end

  def build_yoy(year_month, metrics, start_date, end_date)
    integrations = @client.integrations.active.select(:id, :provider)
    integration_ids = integrations.map(&:id)
    return nil if integration_ids.empty?

    prev_start = start_date.gsub(/^\d{4}/) { |y| (y.to_i - 1).to_s }
    prev_end = end_date.gsub(/^\d{4}/) { |y| (y.to_i - 1).to_s }
    prev_period_key = "#{prev_start}_#{prev_end}"

    prev_data = IntegrationDatum.where(
      integration_id: integration_ids,
      category: "period_summary",
      period: prev_period_key
    ).includes(:integration)

    if prev_data.empty?
      year, month = year_month.split("-").map(&:to_i)
      prev_ym = "#{year - 1}-#{format('%02d', month)}"
      prev_month_start = "#{prev_ym}-01"
      prev_month_end = last_day_of_month(prev_ym)
      prev_key = "#{prev_month_start}_#{prev_month_end}"

      prev_data = IntegrationDatum.where(
        integration_id: integration_ids,
        category: "period_summary",
        period: prev_key
      ).includes(:integration)
    end

    if prev_data.empty?
      prev_data = integrations.map(&:provider).uniq.map do |type|
        IntegrationDatum.where(integration_id: integration_ids)
                       .joins(:integration)
                       .where(integration: { provider: type })
                       .where(category: "summary")
                       .order(fetched_at: :desc)
                       .first
      end.compact
    end

    return nil if prev_data.empty?

    yoy = {}

    if metrics[:revenue]
      prev_rev = prev_data.find { |d| integration_types(d.integration).any? { |t| ECOMMERCE_TYPES.include?(t) } }
      prev_value = prev_rev&.data&.dig("revenue_this_month") || prev_rev&.data&.dig("total_revenue") || prev_rev&.data&.dig("revenueThisMonth") || prev_rev&.data&.dig("totalRevenue")
      if prev_value.present?
        change = (((metrics[:revenue][:value].to_f - prev_value.to_f) / prev_value.to_f) * 100).round
        yoy[:revenue] = { current: metrics[:revenue][:value], previous_year: prev_value.to_f, change_percent: change }
      end
    end

    if metrics[:sessions]
      prev_ses = prev_data.find { |d| integration_types(d.integration).any? { |t| ANALYTICS_TYPES.include?(t) } }
      prev_value = prev_ses&.data&.dig("current", "sessions") || prev_ses&.data&.dig("sessions")
      if prev_value.present?
        change = (((metrics[:sessions][:value].to_f - prev_value.to_f) / prev_value.to_f) * 100).round
        yoy[:sessions] = { current: metrics[:sessions][:value], previous_year: prev_value.to_f, change_percent: change }
      end
    end

    yoy.presence
  end

  def get_cached_narrative(year_month, metrics, objectives, ctx = {})
    row = @client.report_objectives.find_by(year_month: year_month)
    return row.narrative if row&.narrative.present?

    narrative = generate_narrative(metrics, objectives, year_month, ctx)
    if narrative
      obj = @client.report_objectives.find_or_initialize_by(year_month: year_month)
      obj.update!(narrative: narrative, targets: obj.targets || {})
    end
    narrative
  end

  def generate_narrative(metrics, objectives, year_month, investment: nil, yoy: nil, client_name: nil, funnel: nil, shopify_discounts: nil)
    return nil unless has_minimum_data?(metrics)

    begin
      client = AI::OpenrouterClient.new
      today = Date.current
      today_ym = today.strftime("%Y-%m")
      end_date = year_month == today_ym ? today.to_s : last_day_of_month(year_month)
      period_key = "#{year_month}-01_#{end_date}"
      period = "01/#{year_month.split('-')[1]}/#{year_month.split('-')[0]} - #{end_date[8..9]}/#{end_date[5..6]}/#{end_date[0..3]}"

      campaigns = get_campaign_data(period_key)
      enrich_campaign_keywords(campaigns)

      keywords = fetch_keywords

      prompt = build_narrative_prompt(
        client_name: client_name || @client.name,
        year_month: year_month,
        metrics: metrics,
        objectives: objectives,
        investment: investment,
        yoy: yoy,
        campaigns: campaigns,
        funnel: funnel,
        shopify_discounts: shopify_discounts,
        keywords: keywords,
        period: period
      )

      result = client.generate_completion(
        system_prompt: REPORT_NARRATIVE_SYSTEM,
        prompt: prompt,
        max_tokens: 1500,
        temperature: 0.7
      )

      if result[:success]
        { text: result[:content], generated_at: Time.current.iso8601 }
      end
    rescue => e
      Rails.logger.warn "Narrative generation failed: #{e.message}"
      nil
    end
  end

  def fetch_keywords
    ga_ads = @client.integrations.active.find_by(provider: :google)
    return [] unless ga_ads

    kw_data = IntegrationDatum.where(integration_id: ga_ads.id, category: "keywords")
                              .order(fetched_at: :desc).first
    return [] unless kw_data&.data&.is_a?(Array)

    kw_data.data.first(50)
  end

  def save_snapshot(year_month, report)
    snapshot = {
      metrics: report[:metrics],
      sources: report[:sources],
      yoy: report[:yoy],
      investment: report[:investment],
      campaigns: report[:campaigns],
      channels: report[:channels],
      funnel: report[:funnel],
      shopify_discounts: report[:shopify_discounts],
      saved_at: Time.current.iso8601,
      frozen: true
    }

    obj = @client.report_objectives.find_or_initialize_by(year_month: year_month)
    obj.update!(snapshot: snapshot, targets: obj.targets || {})
  rescue => e
    Rails.logger.warn "Snapshot save failed: #{e.message}"
  end

  def validate_targets!(targets)
    raise ArgumentError, "targets must be a Hash" unless targets.is_a?(Hash)

    targets.each do |key, value|
      if key == "ad_spend" && value.is_a?(Hash)
        value.each do |platform, spend|
          raise ArgumentError, "ad_spend.#{platform} must be a positive number" unless spend.is_a?(Numeric) && spend > 0
        end
      elsif value.is_a?(Numeric)
        raise ArgumentError, "#{key} must be a positive number" unless value > 0
      end
    end
  end

  def check_and_trigger_auto_backfill
    @client.integrations.active.each do |integ|
      next unless BACKFILL_CAPABLE_TYPES.include?(integ.provider)
      next if Rails.cache.exist?("backfill_attempted_#{integ.id}")

      oldest = integ.data_points.order(fetched_at: :asc).first
      thirteen_months_ago = 13.months.ago

      if oldest.nil? || oldest.fetched_at < thirteen_months_ago
        Rails.cache.write("backfill_attempted_#{integ.id}", true, expires_in: 1.hour)
        start_backfill(integ.id, auto: true)
      end
    end
  end

  def last_day_of_month(year_month)
    Date.new(*year_month.split("-").map(&:to_i), -1).to_s
  end

  def shift_year(date_str, years)
    d = Date.parse(date_str)
    (d >> (years * 12)).to_s
  end

  def delta(curr, prev)
    return nil if prev.nil? || prev == 0
    (((curr.to_f - prev.to_f) / prev.to_f) * 100).round
  end

  def has_minimum_data?(metrics)
    metrics[:revenue].present? || metrics[:ad_spend].present?
  end

  REPORT_NARRATIVE_SYSTEM = <<~PROMPT.freeze
    Eres un analista senior de marketing digital en una agencia. Escribes reportes mensuales para compartir en canales de Slack del equipo.

    El mensaje completo en Slack tiene este formato (generado por código):
    🟡Cliente: KPIs... (revenue, ROAS, YoY, CPL, etc.)

    [Inversión desglosada por canal + costes fijos + fee]

    [Campañas activas por plataforma]

    TU TRABAJO es generar SOLO el párrafo de análisis estratégico que va después de todo eso.

    REGLAS ESTRICTAS:
    - NO incluyas KPIs, métricas, inversión ni campañas — eso ya está arriba
    - NO escribas "Acumulado del mes", "ROAS", "CPL", "tasa de conversión", "inversión" ni ningún dato numérico que ya aparezca en el bloque anterior
    - NO repitas el nombre del cliente al inicio del análisis
    - Empieza DIRECTAMENTE con el análisis sin introducción ni preámbulo
    - Texto plano, sin markdown, sin HTML, sin listas con guiones
    - 3-5 párrafos separados por doble salto de línea
    - NO uses jamás frases como "revisión exhaustiva de palabras clave", "ajustar pujas", "pruebas A/B", "mejorar la segmentación", "ajustar creatividades", "monitorear el gasto" — son consejos vacíos que valen para cualquier cliente
    - Las creatividades solo se mencionan si el CTR de una campaña ha bajado significativamente o es <1%. No sugieras "revisar creatividades" genéricamente.
    - CADA recomendación debe nombrar una campaña concreta y una acción cuantificable
    - CRÍTICO - ROAS OBJETIVO: En el primer párrafo SIEMPRE indica si estamos por encima o por debajo del ROAS objetivo, mencionando ambos números explícitamente.
    - Si ROAS neto (con fee) está por debajo del objetivo, NO recomiendes aumentar presupuesto genéricamente.
    - CRÍTICO - PRIORIZACIÓN: Cuando recomiendes aumentar presupuesto, ORDENA las campañas candidatas por ROAS descendente.
    - Las campañas están agrupadas por plataforma con encabezados. USA ESTRICTAMENTE esos encabezados para saber a qué plataforma pertenece cada campaña.
    - Si no puedes dar una recomendación específica, no la des
    - NO menciones descuentos de Shopify. Los datos de descuentos solo reflejan cupones, no descuentos sobre precio.
    - CRÍTICO - CAMPAÑAS DE LEADS: Las campañas con objetivo LEADS tienen una misión diferente. DEDICA UN PÁRRAFO SEPARADO (Neutro:) para analizar SOLO campañas LEADS enfocándote exclusivamente en CPL y número de leads generados.
    - CTR: NO menciones CTR a menos que sea relevante para la misión de la campaña.
    - DEVOLUCIONES: NO califiques tasas de devolución como "altas" o "bajas" sin contexto histórico.
    - CADA tema (devoluciones, ROAS, presupuesto) debe empezar con la dirección clara: Positivo / Negativo / Neutro explicado.
    - Si mencionas una métrica, di SIEMPRE el número exacto.
    - Contextualiza cada recomendación con el período al que se refiere.
    - Cuando analices keywords de los últimos 14 días, sé específico: di qué keyword, su gasto, y si conviene pausarla o activarla.
    - NO uses frases relleno: "es crucial", "es importante", "sugiere una necesidad", "es fundamental", "cabe destacar"
    - NO des vueltas. Si son 3 líneas para decir algo que se dice en 1, estás mal.

    TONO:
    - Profesional pero directo, como si hablaras con compañeros de equipo
    - Identifica causas, no solo síntomas
    - Propón acciones concretas cuando algo va mal
    - Si hay datos de campañas, identifica las mejores y peores campañas o estrategias
    - Contextualiza el gasto: si la inversión en Gads ha subido, valora si el crecimiento de ingresos lo justifica antes de decir que es un problema
    - Si una campaña usa keywords de marca, no la sugieras como modelo a replicar para campañas genéricas

    LONGITUD: 150-300 palabras. Sé denso en información, no en relleno.
  PROMPT

  def build_narrative_prompt(client_name:, year_month:, metrics:, objectives:, investment:, yoy:, campaigns:, funnel:, shopify_discounts:, keywords:, period:)
    pct = period.present? ? " (datos: #{period})" : ""
    prompt = "Genera el análisis estratégico para #{client_name || 'el cliente'}, mes #{year_month}.#{pct}\n\n"

    prompt += "=== MÉTRICAS DEL MES ===\n"
    if metrics[:revenue]
      prompt += "Ingresos: #{metrics[:revenue][:value].to_f.round(2)}€\n"
    end
    if metrics[:sessions]
      prompt += "Sesiones web: #{metrics[:sessions][:value]}\n"
    end
    if funnel
      prompt += "CPL: #{funnel[:cpl].to_f.round(2)}€\n" if funnel[:cpl]
      prompt += "Leads: #{funnel[:leads]}\n" if funnel[:leads]
    end
    if metrics[:ad_spend]
      prompt += "Gasto en ads total: #{metrics[:ad_spend]['total'].to_f.round(2)}€\n"
    end

    if objectives.present?
      prompt += "\n=== OBJETIVOS ===\n"
      if objectives["revenue"]
        diff = objectives["revenue"]["actual"].to_f - (objectives["revenue"]["target"].to_f * objectives["revenue"]["pace_expected"].to_f / 100.0)
        prompt += "Ingresos: #{objectives['revenue']['actual'].to_f.round(2)}€ de #{objectives['revenue']['target']}€ (#{objectives['revenue']['pace_actual']}% completado, deberíamos llevar #{objectives['revenue']['pace_expected']}%, #{diff >= 0 ? '+' : ''}#{diff.round(0)}€ vs esperado)\n"
      end
      if objectives["roas"]
        prompt += "ROAS objetivo: #{objectives['roas']['target']}, actual: #{objectives['roas']['actual']}"
        prompt += ", ROAS neto (con fee): #{investment[:roas_net]}" if investment&.dig(:roas_net)
        prompt += "\n"
      end
    end

    if investment.present?
      prompt += "\n=== DESGLOSE DE INVERSIÓN ===\n"
      investment[:platforms]&.each do |platform, data|
        prompt += "Inversión #{platform} = #{data[:spent].to_f.round(2)}€\n"
      end
      investment[:fixed_costs]&.each do |fc|
        prompt += "#{fc[:name]} (#{fc[:monthly]}€) = #{fc[:prorated].to_f.round(2)}€ (Prorrateado)\n"
      end
      if investment.dig(:fee, :amount).to_f > 0
        prompt += "#{investment[:fee][:percent]}% Fee = #{investment[:fee][:amount].to_f.round(2)}€\n"
      end
      if investment.dig(:total, :spent).to_f > 0
        prompt += "Inversión Total = #{investment[:total][:spent].to_f.round(2)}€\n"
      end
      if investment[:roas_net]
        prompt += "ROAS neto (incluyendo fee y costes fijos): #{investment[:roas_net]}\n"
      end
    end

    if yoy.present?
      prompt += "\n=== COMPARACIÓN AÑO ANTERIOR ===\n"
      if yoy[:revenue]
        prompt += "Ingresos vs año anterior: #{yoy[:revenue][:current].to_f.round(2)}€ vs #{yoy[:revenue][:previous_year].to_f.round(2)}€ (#{yoy[:revenue][:change_percent] >= 0 ? '+' : ''}#{yoy[:revenue][:change_percent]}%)\n"
      end
      if yoy[:sessions]
        prompt += "Sesiones vs año anterior: #{yoy[:sessions][:current]} vs #{yoy[:sessions][:previous_year]} (#{yoy[:sessions][:change_percent] >= 0 ? '+' : ''}#{yoy[:sessions][:change_percent]}%)\n"
      end
    end

    if shopify_discounts.present?
      prompt += "\n=== DESCUENTOS SHOPIFY ===\n"
      prompt += "Descuentos totales: #{shopify_discounts[:total_discounts]}€ (#{shopify_discounts[:discount_pct]}% de ventas brutas)\n"
    end

    if campaigns.present? && campaigns.any?
      prompt += "\n=== CAMPAÑAS ===\n"
      platforms = campaigns.map { |c| c["platform"] }.compact.uniq.sort
      platforms.each do |platform|
        platform_camps = campaigns.select { |c| c["platform"] == platform }
                                  .sort_by { |c| -(c["spend"].to_f || 0) }
                                  .first(6)
        prompt += "\n-- #{platform.upcase} --\n"
        platform_camps.each do |c|
          prompt += "[#{platform.upcase}] #{c['name']}: gasto #{c['spend'].to_f.round(2)}€"
          prompt += ", #{c['clicks']} clics" if c['clicks']
          prompt += ", CPC #{c['cpc'].to_f.round(2)}€" if c['cpc']
          prompt += ", CTR #{c['ctr'].to_f.round(2)}%" if c['ctr']
          if c['conversion_value'].to_f > 0 && c['spend'].to_f > 0
            campaign_roas = (c['conversion_value'].to_f / c['spend'].to_f).round(2)
            prompt += ", valor conv. #{c['conversion_value'].to_f.round(2)}€, ROAS #{campaign_roas}x"
          end
          prompt += "\n"
        end
      end
    end

    if keywords.present? && keywords.any?
      prompt += "\n=== KEYWORDS (últimos 14 días, top por gasto) ===\n"
      top_kw = keywords.sort_by { |k| -(k["spend"].to_f || 0) }.first(15)
      top_kw.each do |kw|
        prompt += "#{kw['keyword']} (#{kw['match_type']}): gasto #{kw['spend'].to_f.round(2)}€"
        prompt += ", #{kw['clicks']} clics" if kw['clicks']
        if kw['conversions'].to_i > 0 && kw['spend'].to_f > 0
          conv_val = kw['conversion_value'].to_f
          kw_roas = conv_val / kw['spend'].to_f
          prompt += ", #{kw['conversions']} conv (valor #{conv_val.round(2)}€, ROAS #{kw_roas.round(2)}x)" if conv_val > 0
        end
        prompt += "\n"
      end
    end

    prompt += "\nEscribe SOLO el análisis estratégico (3-5 párrafos). NO repitas KPIs, inversión, campañas ni ningún dato que ya esté en el mensaje. Empieza directo con el análisis:"
    prompt
  end
end
