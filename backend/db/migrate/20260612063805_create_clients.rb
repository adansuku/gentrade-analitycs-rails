class CreateClients < ActiveRecord::Migration[8.0]
  def change
    create_table :clients do |t|
      t.string :name, null: false
      t.string :email, null: false
      t.integer :industry
      t.text :description
      t.jsonb :metadata, default: {}
      t.datetime :deleted_at

      t.timestamps
    end

    add_index :clients, :email, unique: true
    add_index :clients, :industry
    add_index :clients, :deleted_at
  end
end
