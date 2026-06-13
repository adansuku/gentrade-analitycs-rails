class CreateMetrics < ActiveRecord::Migration[8.0]
  def change
    create_table :metrics do |t|
      t.references :client, null: false, foreign_key: true
      t.references :integration, null: false, foreign_key: true
      t.integer :source, null: false, default: 0
      t.string :metric_type, null: false
      t.decimal :value, precision: 15, scale: 2, default: 0.0
      t.date :date, null: false
      t.jsonb :metadata, default: {}

      t.timestamps
    end

    # Indexes for efficient queries
    add_index :metrics, :source
    add_index :metrics, :metric_type
    add_index :metrics, :date
    add_index :metrics, [:client_id, :source, :date]
    add_index :metrics, [:integration_id, :date]
  end
end
