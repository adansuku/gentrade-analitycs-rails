FactoryBot.define do
  factory :material do
    client { nil }
    material_type { 1 }
    content { "MyText" }
    file_url { "MyString" }
    metadata { "" }
  end
end
