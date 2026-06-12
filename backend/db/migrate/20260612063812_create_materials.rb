class CreateMaterials < ActiveRecord::Migration[8.0]
  def change
    create_table :materials do |t|
      t.references :client, null: false, foreign_key: true
      t.integer :material_type, null: false
      t.text :content, null: false
      t.string :file_url
      t.jsonb :metadata, default: {}

      t.timestamps
    end

    add_index :materials, :material_type
  end
end
