class CreateClientDailySnapshots < ActiveRecord::Migration[8.0]
  def change
    create_table :client_daily_snapshots do |t|
      t.references :client, null: false, foreign_key: true
      t.date :date, null: false
      t.jsonb :stats, default: {}
      t.jsonb :ecommerce
      t.jsonb :insights

      t.timestamps
    end

    add_index :client_daily_snapshots, [:client_id, :date], unique: true, name: "idx_client_snap_on_client_date"
  end
end
