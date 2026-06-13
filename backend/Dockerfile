# syntax=docker/dockerfile:1
# check=error=true

ARG RUBY_VERSION=3.3.0

# =============================================================================
# base: Runtime system dependencies (kept in final production image)
# =============================================================================
FROM docker.io/library/ruby:$RUBY_VERSION-slim AS base

WORKDIR /app

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    curl libjemalloc2 libvips postgresql-client && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# =============================================================================
# build-deps: Build tools layered on base (discarded from final image)
# =============================================================================
FROM base AS build-deps

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential git libpq-dev libyaml-dev pkg-config && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# =============================================================================
# gems: Install ALL gems (development + production) for dev target
# =============================================================================
FROM build-deps AS gems

ENV BUNDLE_PATH=/usr/local/bundle

COPY Gemfile Gemfile.lock ./
RUN bundle install && \
    rm -rf ~/.bundle/ "${BUNDLE_PATH}"/ruby/*/cache "${BUNDLE_PATH}"/ruby/*/bundler/gems/*/.git
RUN bundle exec bootsnap precompile --gemfile

# =============================================================================
# development: Hot-reload target — NO app code copied, use volume mount
#   docker compose up backend   (default target)
# =============================================================================
FROM gems AS development

ENV RAILS_ENV=development

EXPOSE 3002

# =============================================================================
# gems-prod: Install only production gems (smaller final image)
# =============================================================================
FROM build-deps AS gems-prod

ENV BUNDLE_PATH=/usr/local/bundle \
    BUNDLE_DEPLOYMENT=1 \
    BUNDLE_WITHOUT="development test"

COPY Gemfile Gemfile.lock ./
RUN bundle install && \
    rm -rf ~/.bundle/ "${BUNDLE_PATH}"/ruby/*/cache "${BUNDLE_PATH}"/ruby/*/bundler/gems/*/.git
RUN bundle exec bootsnap precompile --gemfile

# =============================================================================
# build: Production build — copy app code, precompile bootsnap
# =============================================================================
FROM gems-prod AS build

COPY . .

RUN bundle exec bootsnap precompile app/ lib/ && \
    SECRET_KEY_BASE_DUMMY=1 rails assets:precompile

# =============================================================================
# production: Minimal runtime image with app + gems
#   docker build --target production -t gentrade .
# =============================================================================
FROM base AS production

ENV RAILS_ENV=production \
    BUNDLE_PATH=/usr/local/bundle

COPY --from=build /usr/local/bundle /usr/local/bundle
COPY --from=build /app /app

RUN groupadd --system --gid 1000 rails && \
    useradd rails --uid 1000 --gid 1000 --create-home --shell /bin/bash && \
    chown -R rails:rails db log storage tmp
USER 1000:1000

ENTRYPOINT ["/app/bin/docker-entrypoint"]
EXPOSE 80
CMD ["./bin/thrust", "./bin/rails", "server"]
