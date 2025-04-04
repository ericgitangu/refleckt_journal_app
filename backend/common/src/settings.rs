use reqwest::Client;
use serde::{Deserialize, Serialize};
use crate::JournalError;

#[derive(Debug, Serialize, Deserialize)]
pub struct UserSettings {
    pub tenant_id: String,
    pub user_id: String,
    pub theme: Option<String>,
    pub date_format: Option<String>,
    pub notification_preferences: Option<NotificationPreferences>,
    pub display_preferences: Option<DisplayPreferences>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NotificationPreferences {
    pub email_notifications: bool,
    pub reminders_enabled: bool,
    pub reminder_time: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DisplayPreferences {
    pub default_view: Option<String>,
    pub entries_per_page: Option<i32>,
    pub show_word_count: Option<bool>,
    pub show_insights: Option<bool>,
}

// Create a common client for all services to fetch user settings
pub async fn get_user_settings(
    user_id: &str,
    client: &Client,
    settings_url: &str,
) -> Result<UserSettings, JournalError> {
    let url = format!("{}/users/{}/settings", settings_url, user_id);
    
    let response = client.get(&url)
        .send()
        .await
        .map_err(|e| JournalError::InternalError(format!("Failed to fetch settings: {}", e)))?
        .json::<UserSettings>()
        .await
        .map_err(|e| JournalError::InternalError(format!("Failed to parse settings: {}", e)))?;
        
    Ok(response)
} 