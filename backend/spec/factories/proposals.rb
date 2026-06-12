FactoryBot.define do
  factory :proposal do
    client { nil }
    status { 1 }
    title { "MyString" }
    metadata { "" }
  end
end
