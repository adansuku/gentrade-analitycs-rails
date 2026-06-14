FactoryBot.define do
  factory :proposal_version do
    proposal { nil }
    sequence(:version_number) { |n| n }
    content { "MyText" }
  end
end
