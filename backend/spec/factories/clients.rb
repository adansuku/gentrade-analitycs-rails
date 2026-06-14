FactoryBot.define do
  factory :client do
    sequence(:name) { |n| "Client #{n}" }
    sequence(:email) { |n| "client#{n}@example.com" }
    industry { 1 }
    description { "A test client" }
    metadata { {} }
    deleted_at { nil }
  end
end
