class CreateProposalVersions < ActiveRecord::Migration[8.0]
  def change
    create_table :proposal_versions do |t|
      t.references :proposal, null: false, foreign_key: true
      t.integer :version_number, null: false
      t.text :content, null: false

      t.timestamps
    end

    add_index :proposal_versions, [:proposal_id, :version_number], unique: true
  end
end
