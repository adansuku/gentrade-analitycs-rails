FactoryBot.define do
  factory :integration do
    client { nil }
    provider { "MyString" }
    access_token { "MyText" }
    refresh_token { "MyText" }
    expires_at { "2026-06-13 00:42:58" }
    metadata { "" }
    status { 1 }
  end
end
