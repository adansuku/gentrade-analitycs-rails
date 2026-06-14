FactoryBot.define do
  factory :material do
    client { nil }
    material_type { :note }
    content { "MyText" }
    file_url { "MyString" }
    metadata { {} }
  end
end
