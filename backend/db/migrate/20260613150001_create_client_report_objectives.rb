class CreateClientReportObjectives < ActiveRecord::Migration[8.0]
  def change
    create_table :client_report_objectives do |t|
      t.references :client, null: false, foreign_key: true
      t.string :year_month, null: false
      t.jsonb :targets, default: {}
      t.jsonb :costs
      t.jsonb :narrative
      t.jsonb :snapshot

      t.timestamps
    end

    add_index :client_report_objectives, [:client_id, :year_month], unique: true, name: "idx_client_obj_on_client_year_month"
  end
end
