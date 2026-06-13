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

ActiveRecord::Schema[8.0].define(version: 2026_06_12_234257) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

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
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  add_foreign_key "integrations", "clients"
  add_foreign_key "materials", "clients"
  add_foreign_key "proposal_messages", "proposals"
  add_foreign_key "proposal_versions", "proposals"
  add_foreign_key "proposals", "clients"
end
