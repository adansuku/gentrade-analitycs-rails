class CreateProposalMessages < ActiveRecord::Migration[8.0]
  def change
    create_table :proposal_messages do |t|
      t.references :proposal, null: false, foreign_key: true
      t.string :role, null: false
      t.text :content, null: false

      t.timestamps
    end
  end
end
