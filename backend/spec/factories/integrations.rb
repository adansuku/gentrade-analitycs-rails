FactoryBot.define do
  factory :integration do
    client { nil }
    provider { :google }
    access_token { "test-access-token" }
    refresh_token { "test-refresh-token" }
    expires_at { 1.day.from_now }
    metadata { {} }
    status { :active }
  end
end
