FactoryBot.define do
  factory :proposal_message do
    proposal { nil }
    role { "user" }
    content { "MyText" }
  end
end
