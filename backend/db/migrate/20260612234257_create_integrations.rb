class CreateIntegrations < ActiveRecord::Migration[8.0]
  def change
    create_table :integrations do |t|
      t.references :client, null: false, foreign_key: true
      t.string :provider, null: false
      t.text :access_token
      t.text :refresh_token
      t.datetime :expires_at
      t.jsonb :metadata, default: {}
      t.integer :status, default: 0

      t.timestamps
    end

    add_index :integrations, [:client_id, :provider], unique: true
    add_index :integrations, :provider
    add_index :integrations, :status
  end
end
