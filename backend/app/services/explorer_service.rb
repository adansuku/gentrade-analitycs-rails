class ExplorerService
  def initialize(client)
    @client = client
  end

  def get_explorer_summary
    @client.integrations.map do |integ|
      categories = IntegrationDatum.where(integration_id: integ.id)
                                   .group(:category)
                                   .select(
                                     :category,
                                     "COUNT(*) as count",
                                     "MIN(fetched_at) as earliest",
                                     "MAX(fetched_at) as latest"
                                   )

      {
        integration_id: integ.id,
        type: integ.provider,
        status: integ.status,
        last_sync_at: integ.metadata&.dig("last_sync_at"),
        total_records: integ.data_points.size,
        categories: categories.map do |c|
          {
            name: c.category,
            count: c.count,
            earliest: c.earliest&.to_date&.to_s,
            latest: c.latest&.to_date&.to_s
          }
        end
      }
    end
  end

  def get_explorer_data(integration_id:, category: nil, from: nil, to: nil, page: 1, limit: 20)
    integ = @client.integrations.find_by(id: integration_id)
    return { records: [], total: 0, page: page, limit: limit, total_pages: 0 } unless integ

    query = IntegrationDatum.where(integration_id: integration_id)
    query = query.where(category: category) if category.present?

    if from.present? || to.present?
      range = {}
      range[:gte] = Date.parse(from) if from.present?
      range[:lte] = Date.parse(to).end_of_day if to.present?
      query = query.where(fetched_at: range) if range.any?
    end

    total = query.count
    records = query.order(fetched_at: :desc)
                   .offset((page - 1) * limit)
                   .limit(limit)
                   .select(:id, :category, :period, :fetched_at, :data)

    {
      records: records,
      total: total,
      page: page,
      limit: limit,
      total_pages: (total.to_f / limit).ceil
    }
  end
end
