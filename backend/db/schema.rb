# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2026_06_13_150002) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "client_daily_snapshots", force: :cascade do |t|
    t.bigint "client_id", null: false
    t.date "date", null: false
    t.jsonb "stats", default: {}
    t.jsonb "ecommerce"
    t.jsonb "insights"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["client_id", "date"], name: "idx_client_snap_on_client_date", unique: true
    t.index ["client_id"], name: "index_client_daily_snapshots_on_client_id"
  end

  create_table "client_report_objectives", force: :cascade do |t|
    t.bigint "client_id", null: false
    t.string "year_month", null: false
    t.jsonb "targets", default: {}
    t.jsonb "costs"
    t.jsonb "narrative"
    t.jsonb "snapshot"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["client_id", "year_month"], name: "idx_client_obj_on_client_year_month", unique: true
    t.index ["client_id"], name: "index_client_report_objectives_on_client_id"
  end

  create_table "clients", force: :cascade do |t|
    t.string "name", null: false
    t.string "email", null: false
    t.integer "industry"
    t.text "description"
    t.jsonb "metadata", default: {}
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["deleted_at"], name: "index_clients_on_deleted_at"
    t.index ["email"], name: "index_clients_on_email", unique: true
    t.index ["industry"], name: "index_clients_on_industry"
  end

  create_table "integration_data", force: :cascade do |t|
    t.bigint "integration_id", null: false
    t.string "category", null: false
    t.jsonb "data", default: {}
    t.string "period"
    t.datetime "fetched_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["fetched_at"], name: "index_integration_data_on_fetched_at"
    t.index ["integration_id", "category", "period"], name: "idx_on_integration_id_category_period_8f285dd232"
    t.index ["integration_id", "category"], name: "index_integration_data_on_integration_id_and_category"
    t.index ["integration_id"], name: "index_integration_data_on_integration_id"
  end

  create_table "integrations", force: :cascade do |t|
    t.bigint "client_id", null: false
    t.string "provider", null: false
    t.text "access_token"
    t.text "refresh_token"
    t.datetime "expires_at"
    t.jsonb "metadata", default: {}
    t.integer "status", default: 0
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["client_id", "provider"], name: "index_integrations_on_client_id_and_provider", unique: true
    t.index ["client_id"], name: "index_integrations_on_client_id"
    t.index ["provider"], name: "index_integrations_on_provider"
    t.index ["status"], name: "index_integrations_on_status"
  end

  create_table "materials", force: :cascade do |t|
    t.bigint "client_id", null: false
    t.integer "material_type", null: false
    t.text "content", null: false
    t.string "file_url"
    t.jsonb "metadata", default: {}
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["client_id"], name: "index_materials_on_client_id"
    t.index ["material_type"], name: "index_materials_on_material_type"
  end

  create_table "metrics", force: :cascade do |t|
    t.bigint "client_id", null: false
    t.bigint "integration_id", null: false
    t.integer "source", default: 0, null: false
    t.string "metric_type", null: false
    t.decimal "value", precision: 15, scale: 2, default: "0.0"
    t.date "date", null: false
    t.jsonb "metadata", default: {}
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["client_id", "source", "date"], name: "index_metrics_on_client_id_and_source_and_date"
    t.index ["client_id"], name: "index_metrics_on_client_id"
    t.index ["date"], name: "index_metrics_on_date"
    t.index ["integration_id", "date"], name: "index_metrics_on_integration_id_and_date"
    t.index ["integration_id"], name: "index_metrics_on_integration_id"
    t.index ["metric_type"], name: "index_metrics_on_metric_type"
    t.index ["source"], name: "index_metrics_on_source"
  end

  create_table "proposal_messages", force: :cascade do |t|
    t.bigint "proposal_id", null: false
    t.string "role", null: false
    t.text "content", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["proposal_id"], name: "index_proposal_messages_on_proposal_id"
  end

  create_table "proposal_versions", force: :cascade do |t|
    t.bigint "proposal_id", null: false
    t.integer "version_number", null: false
    t.text "content", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["proposal_id", "version_number"], name: "index_proposal_versions_on_proposal_id_and_version_number", unique: true
    t.index ["proposal_id"], name: "index_proposal_versions_on_proposal_id"
  end

  create_table "proposals", force: :cascade do |t|
    t.bigint "client_id", null: false
    t.integer "status", default: 0, null: false
    t.string "title"
    t.jsonb "metadata", default: {}
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["client_id"], name: "index_proposals_on_client_id"
    t.index ["status"], name: "index_proposals_on_status"
  end

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "role", default: 2, null: false
    t.string "confirmation_token"
    t.datetime "confirmed_at"
    t.datetime "confirmation_sent_at"
    t.string "unconfirmed_email"
    t.integer "sign_in_count", default: 0, null: false
    t.datetime "current_sign_in_at"
    t.datetime "last_sign_in_at"
    t.string "current_sign_in_ip"
    t.string "last_sign_in_ip"
    t.index ["confirmation_token"], name: "index_users_on_confirmation_token", unique: true
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
    t.index ["role"], name: "index_users_on_role"
  end

  add_foreign_key "client_daily_snapshots", "clients"
  add_foreign_key "client_report_objectives", "clients"
  add_foreign_key "integration_data", "integrations"
  add_foreign_key "integrations", "clients"
  add_foreign_key "materials", "clients"
  add_foreign_key "metrics", "clients"
  add_foreign_key "metrics", "integrations"
  add_foreign_key "proposal_messages", "proposals"
  add_foreign_key "proposal_versions", "proposals"
  add_foreign_key "proposals", "clients"
end
