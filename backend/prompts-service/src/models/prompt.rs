#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Prompt {
    pub id: String,
    pub text: String,
    pub category: String,        // Add category field
    pub tags: Vec<String>,       // Add tags for better organization
    pub difficulty: String,      // Add difficulty level (e.g., "beginner", "deep")
    pub mood_appropriate: Option<Vec<String>>, // Optional moods this prompt works well with
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PromptQuery {
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub mood: Option<String>,
    pub difficulty: Option<String>,
    pub exclude_ids: Option<Vec<String>>, // Prompts to exclude (already shown)
} 