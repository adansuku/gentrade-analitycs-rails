FactoryBot.define do
  factory :proposal_version do
    proposal { nil }
    version_number { 1 }
    content { "MyText" }
  end
end
