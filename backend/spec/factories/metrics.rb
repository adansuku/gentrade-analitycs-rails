FactoryBot.define do
  factory :metric do
    client { nil }
    integration { nil }
    source { :shopify }
    metric_type { "revenue" }
    value { "9.99" }
    date { "2026-06-13" }
    metadata { {} }
  end
end
