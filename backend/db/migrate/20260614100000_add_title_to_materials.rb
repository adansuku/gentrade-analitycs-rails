class AddTitleToMaterials < ActiveRecord::Migration[8.0]
  def change
    add_column :materials, :title, :string
  end
end
