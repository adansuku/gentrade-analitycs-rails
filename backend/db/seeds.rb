puts "🌱 Seeding database..."

# Create test user
puts "Creating test user..."
user = User.find_or_create_by!(email: 'admin@gentrade.com') do |u|
  u.password = 'gentrade2024'
  u.password_confirmation = 'gentrade2024'
  u.role = :admin
end
user.confirm unless user.confirmed?
puts "✅ User created: admin@gentrade.com / gentrade2024"

# Create clients
puts "Creating clients..."
clients_data = [
  { name: 'Acme Corp', email: 'contact@acme.com', industry: :technology, description: 'Leading tech company' },
  { name: 'TechStart Inc', email: 'hello@techstart.com', industry: :technology, description: 'Innovative startup' },
  { name: 'Retail Plus', email: 'info@retailplus.com', industry: :retail, description: 'Retail chain' },
  { name: 'FinanceHub', email: 'support@financehub.com', industry: :finance, description: 'Financial services' },
  { name: 'HealthCare Co', email: 'contact@healthcare.com', industry: :healthcare, description: 'Healthcare provider' }
]

clients_data.each do |client_data|
  client = Client.find_or_create_by!(email: client_data[:email]) do |c|
    c.name = client_data[:name]
    c.industry = client_data[:industry]
    c.description = client_data[:description]
  end
  puts "  ✓ Created: #{client.name}"

  # Add some materials if they don't exist
  if client.materials.empty?
    3.times do |i|
      Material.create!(
        client: client,
        material_type: [:note, :email, :pdf].sample,
        content: "Sample material #{i+1} for #{client.name}"
      )
    end
  end
end

puts "✅ Created #{Client.count} clients with materials"
puts "🎉 Seeding completed!"
