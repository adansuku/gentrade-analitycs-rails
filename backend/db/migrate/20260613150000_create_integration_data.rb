class CreateIntegrationData < ActiveRecord::Migration[8.0]
  def change
    create_table :integration_data do |t|
      t.references :integration, null: false, foreign_key: true
      t.string :category, null: false
      t.jsonb :data, default: {}
      t.string :period
      t.datetime :fetched_at, null: false, default: -> { "CURRENT_TIMESTAMP" }

      t.timestamps
    end

    add_index :integration_data, [:integration_id, :category]
    add_index :integration_data, [:integration_id, :category, :period]
    add_index :integration_data, :fetched_at
  end
end
