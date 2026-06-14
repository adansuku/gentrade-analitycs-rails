FactoryBot.define do
  factory :proposal do
    client { nil }
    status { :draft }
    title { "MyString" }
    metadata { {} }
  end
end
