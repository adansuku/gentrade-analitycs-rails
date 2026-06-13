FactoryBot.define do
  factory :metric do
    client { nil }
    integration { nil }
    source { 1 }
    metric_type { "MyString" }
    value { "9.99" }
    date { "2026-06-13" }
    metadata { "" }
  end
end
