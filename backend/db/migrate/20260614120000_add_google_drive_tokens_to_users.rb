class AddGoogleDriveTokensToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :google_drive_token, :text
    add_column :users, :google_drive_refresh_token, :text
    add_column :users, :google_drive_token_expires_at, :datetime
  end
end
