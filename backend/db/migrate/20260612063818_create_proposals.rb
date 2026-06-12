class CreateProposals < ActiveRecord::Migration[8.0]
  def change
    create_table :proposals do |t|
      t.references :client, null: false, foreign_key: true
      t.integer :status, null: false, default: 0
      t.string :title
      t.jsonb :metadata, default: {}

      t.timestamps
    end

    add_index :proposals, :status
  end
end
