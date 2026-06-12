#!/bin/bash
# rails-bootstrap-script.sh
# Script to bootstrap GENTRADE Rails project structure
# Run this after creating the basic Rails app

set -e

echo "🚀 Bootstrapping GENTRADE Rails Project..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create directory structure
echo -e "${BLUE}📁 Creating directory structure...${NC}"
mkdir -p app/use_cases/{clients,proposals,materials,integrations,analytics}
mkdir -p app/services/{clients,proposals,integrations,ai,analytics}
mkdir -p app/services/integrations/{google,meta}
mkdir -p app/repositories
mkdir -p app/serializers
mkdir -p lib/{google_client,meta_client,openrouter_client,slack_client}
mkdir -p spec/use_cases/{clients,proposals,integrations}
mkdir -p spec/services/{clients,proposals,integrations,ai}
mkdir -p spec/repositories
mkdir -p spec/requests/api/v1
mkdir -p spec/support
echo -e "${GREEN}✓ Directory structure created${NC}"

# Create base Result class
echo -e "${BLUE}📝 Creating base Result class...${NC}"
cat > app/models/result.rb << 'EOF'
# app/models/result.rb
class Result
  attr_reader :data, :errors

  def initialize(success:, data: {}, errors: [])
    @success = success
    @data = data
    @errors = errors
  end

  def success?
    @success
  end

  def failure?
    !@success
  end

  def self.success(**data)
    new(success: true, data: data)
  end

  def self.failure(errors:)
    new(success: false, errors: Array(errors))
  end

  # Convenient accessors
  def method_missing(method, *args)
    return data[method] if data.key?(method)
    super
  end

  def respond_to_missing?(method, include_private = false)
    data.key?(method) || super
  end
end
EOF
echo -e "${GREEN}✓ Result class created${NC}"

# Create ApplicationController
echo -e "${BLUE}📝 Creating ApplicationController...${NC}"
cat > app/controllers/application_controller.rb << 'EOF'
# app/controllers/application_controller.rb
class ApplicationController < ActionController::API
  rescue_from ActiveRecord::RecordNotFound, with: :not_found
  rescue_from ActionController::ParameterMissing, with: :bad_request

  private

  def current_user
    @current_user ||= authenticate_user
  end

  def authenticate_user
    header = request.headers['Authorization']
    return nil unless header

    token = header.split(' ').last
    decoded = JWT.decode(token, jwt_secret, true, algorithm: 'HS256')
    User.find(decoded[0]['user_id'])
  rescue JWT::DecodeError, ActiveRecord::RecordNotFound
    nil
  end

  def authenticate_user!
    render json: { error: 'Unauthorized' }, status: :unauthorized unless current_user
  end

  def jwt_secret
    ENV.fetch('JWT_SECRET', 'your-secret-key')
  end

  def not_found(exception)
    render json: { error: exception.message }, status: :not_found
  end

  def bad_request(exception)
    render json: { error: exception.message }, status: :bad_request
  end
end
EOF
echo -e "${GREEN}✓ ApplicationController created${NC}"

# Create RSpec support files
echo -e "${BLUE}📝 Creating RSpec support files...${NC}"

cat > spec/support/factory_bot.rb << 'EOF'
# spec/support/factory_bot.rb
RSpec.configure do |config|
  config.include FactoryBot::Syntax::Methods
end
EOF

cat > spec/support/database_cleaner.rb << 'EOF'
# spec/support/database_cleaner.rb
RSpec.configure do |config|
  config.before(:suite) do
    DatabaseCleaner.clean_with(:truncation)
  end

  config.before(:each) do
    DatabaseCleaner.strategy = :transaction
  end

  config.before(:each, type: :request) do
    DatabaseCleaner.strategy = :truncation
  end

  config.before(:each) do
    DatabaseCleaner.start
  end

  config.after(:each) do
    DatabaseCleaner.clean
  end
end
EOF

cat > spec/support/shoulda_matchers.rb << 'EOF'
# spec/support/shoulda_matchers.rb
Shoulda::Matchers.configure do |config|
  config.integrate do |with|
    with.test_framework :rspec
    with.library :rails
  end
end
EOF

cat > spec/support/request_helpers.rb << 'EOF'
# spec/support/request_helpers.rb
module RequestHelpers
  def json_response
    JSON.parse(response.body)
  end

  def auth_headers(user)
    token = JWT.encode({ user_id: user.id }, jwt_secret, 'HS256')
    { 'Authorization' => "Bearer #{token}" }
  end

  private

  def jwt_secret
    ENV.fetch('JWT_SECRET', 'your-secret-key')
  end
end

RSpec.configure do |config|
  config.include RequestHelpers, type: :request
end
EOF

echo -e "${GREEN}✓ RSpec support files created${NC}"

# Create .env.example
echo -e "${BLUE}📝 Creating .env.example...${NC}"
cat > .env.example << 'EOF'
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/gentrade_rails_development

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=86400

# AI Services
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-v1-...
LLM_MODEL=anthropic/claude-3.5-sonnet
LLM_MODEL_FAST=anthropic/claude-3-haiku
LLM_MAX_TOKENS=2000
LLM_TEMPERATURE=0.7

# Google OAuth
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=http://localhost:3001/api/integrations/google/callback

# Meta OAuth
META_APP_ID=...
META_APP_SECRET=...
META_REDIRECT_URI=http://localhost:3001/api/integrations/meta/callback

# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Frontend
FRONTEND_URL=http://localhost:5173
EOF
echo -e "${GREEN}✓ .env.example created${NC}"

# Create .rubocop.yml
echo -e "${BLUE}📝 Creating .rubocop.yml...${NC}"
cat > .rubocop.yml << 'EOF'
require:
  - rubocop-rails
  - rubocop-rspec
  - rubocop-performance

AllCops:
  NewCops: enable
  TargetRubyVersion: 3.3
  Exclude:
    - 'db/schema.rb'
    - 'db/migrate/*'
    - 'bin/*'
    - 'vendor/**/*'
    - 'node_modules/**/*'

Metrics/MethodLength:
  Max: 10

Metrics/ClassLength:
  Max: 100

Metrics/BlockLength:
  Exclude:
    - 'spec/**/*'
    - 'config/**/*'

Metrics/CyclomaticComplexity:
  Max: 6

Metrics/AbcSize:
  Max: 15

Style/Documentation:
  Enabled: false

Style/StringLiterals:
  EnforcedStyle: single_quotes

Layout/LineLength:
  Max: 120

RSpec/ExampleLength:
  Max: 15

RSpec/MultipleExpectations:
  Max: 5

RSpec/NestedGroups:
  Max: 5
EOF
echo -e "${GREEN}✓ .rubocop.yml created${NC}"

# Create README
echo -e "${BLUE}📝 Creating README.md...${NC}"
cat > README.md << 'EOF'
# GENTRADE Analytics — Rails Backend

Clean Architecture Rails API for GENTRADE Analytics platform.

## Tech Stack

- **Ruby**: 3.3.0
- **Rails**: 8.0+
- **Database**: PostgreSQL 15
- **Cache/Jobs**: Redis 7 + Sidekiq
- **Testing**: RSpec + FactoryBot
- **AI**: OpenRouter (Claude 3.5 Sonnet)

## Prerequisites

- Ruby 3.3.0
- Docker & Docker Compose
- Node.js 18+ (for frontend)

## Quick Start

1. **Clone and install**
   ```bash
   git clone <repo>
   cd gentrade-rails
   bundle install
   ```

2. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Start services**
   ```bash
   docker-compose up -d
   ```

4. **Setup database**
   ```bash
   rails db:create db:migrate db:seed
   ```

5. **Run server**
   ```bash
   rails s -p 3001
   ```

6. **Run tests**
   ```bash
   bundle exec rspec
   ```

## Architecture

```
┌─────────────────────────────────────────┐
│         Controllers (API/V1)            │  ← HTTP layer
├─────────────────────────────────────────┤
│           Use Cases                     │  ← Application layer
├─────────────────────────────────────────┤
│           Services                      │  ← Business logic
├─────────────────────────────────────────┤
│         Repositories                    │  ← Data access
├─────────────────────────────────────────┤
│       Models (ActiveRecord)             │  ← Persistence
└─────────────────────────────────────────┘
```

## API Endpoints

- `GET /api/v1/clients` - List clients
- `POST /api/v1/clients` - Create client
- `GET /api/v1/clients/:id` - Get client
- `POST /api/v1/clients/:id/proposals/generate` - Generate proposal
- More endpoints in API documentation

## Development

```bash
# Run server
rails s -p 3001

# Run tests
bundle exec rspec

# Run rubocop
bundle exec rubocop -A

# Rails console
rails c

# Run Sidekiq
bundle exec sidekiq

# Database operations
rails db:migrate
rails db:seed
rails db:reset
```

## Testing

```bash
# All tests
bundle exec rspec

# Specific file
bundle exec rspec spec/models/client_spec.rb

# With coverage
COVERAGE=true bundle exec rspec
open coverage/index.html
```

## Code Quality

```bash
# Rubocop
bundle exec rubocop

# Auto-fix
bundle exec rubocop -A
```

## Deployment

See `docs/deployment.md`

## Documentation

- [Architecture Design](docs/architecture.md)
- [API Documentation](docs/api.md)
- [Migration Plan](docs/migration.md)

## License

MIT
EOF
echo -e "${GREEN}✓ README.md created${NC}"

# Create docker-compose.yml if not exists
if [ ! -f docker-compose.yml ]; then
  echo -e "${BLUE}📝 Creating docker-compose.yml...${NC}"
  cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: gentrade-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: gentrade_rails_development
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: gentrade-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
EOF
  echo -e "${GREEN}✓ docker-compose.yml created${NC}"
fi

# Create .gitignore additions
echo -e "${BLUE}📝 Updating .gitignore...${NC}"
cat >> .gitignore << 'EOF'

# Environment variables
.env
.env.local

# Coverage
coverage/

# IDE
.idea/
.vscode/

# macOS
.DS_Store
EOF
echo -e "${GREEN}✓ .gitignore updated${NC}"

# Summary
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Bootstrap complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Copy .env.example to .env and configure:"
echo "   cp .env.example .env"
echo ""
echo "2. Start Docker services:"
echo "   docker-compose up -d"
echo ""
echo "3. Create and migrate database:"
echo "   rails db:create db:migrate"
echo ""
echo "4. Run tests:"
echo "   bundle exec rspec"
echo ""
echo "5. Start Rails server:"
echo "   rails s -p 3001"
echo ""
echo -e "${BLUE}📚 Documentation available in _bmad/specs/${NC}"
echo ""
