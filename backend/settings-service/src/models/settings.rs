#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserSettings {
    pub user_id: String,
    // General preferences
    pub theme: String,
    pub language: String,
    
    // Privacy settings
    pub ai_insights_enabled: bool,
    pub data_sharing_enabled: bool,
    
    // Notification preferences
    pub daily_reminder_enabled: bool,
    pub daily_reminder_time: String,
    
    // Prompt preferences
    pub preferred_prompt_categories: Option<Vec<String>>,
    pub preferred_prompt_tags: Option<Vec<String>>,
    pub prompt_difficulty: Option<String>,
    
    // UI preferences
    pub default_view: String,
    pub editor_font_size: i32,
    
    // Updated timestamp
    pub updated_at: String,
} 