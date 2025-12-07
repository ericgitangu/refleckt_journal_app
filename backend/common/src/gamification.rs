use serde::{Deserialize, Serialize};

/// Gamification statistics for a user
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GamificationStats {
    pub user_id: String,
    pub tenant_id: String,
    pub points_balance: i64,
    pub lifetime_points: i64,
    pub level: i32,
    pub level_title: String,
    pub current_streak: i32,
    pub longest_streak: i32,
    pub last_entry_date: Option<String>,
    pub achievements: Vec<Achievement>,
    pub total_entries: i32,
    pub total_words: i64,
    pub insights_requested: i32,
    pub prompts_used: i32,
    pub created_at: String,
    pub updated_at: String,
}

/// An achievement that can be unlocked
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Achievement {
    pub id: String,
    pub name: String,
    pub description: String,
    pub icon: String,
    pub points: i32,
    pub unlocked: bool,
    pub unlocked_at: Option<String>,
    pub category: String,
    pub requirement: i32,
    pub progress: Option<i32>,
}

/// A point transaction record
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PointTransaction {
    pub id: String,
    pub user_id: String,
    pub tenant_id: String,
    pub action: String,
    pub points: i64,
    pub description: String,
    pub created_at: String,
    pub metadata: Option<serde_json::Value>,
}

/// Entry event from EventBridge
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryEvent {
    pub entry_id: String,
    pub user_id: String,
    pub tenant_id: String,
    pub word_count: i64,
    pub created_at: String,
}

// Points constants
pub const POINTS_ENTRY_CREATED: i64 = 10;
pub const POINTS_WORD_BONUS_100: i64 = 5;
pub const POINTS_WORD_BONUS_300: i64 = 10;
pub const POINTS_WORD_BONUS_500: i64 = 15;
pub const POINTS_STREAK_CONTINUED: i64 = 15;
pub const POINTS_STREAK_7_DAYS: i64 = 50;
pub const POINTS_STREAK_30_DAYS: i64 = 200;
pub const POINTS_AI_INSIGHTS: i64 = 5;
pub const POINTS_PROMPT_USED: i64 = 5;
pub const POINTS_FIRST_ENTRY_OF_DAY: i64 = 5;

/// Get level and title from lifetime points
pub fn get_level_from_points(points: i64) -> (i32, &'static str) {
    match points {
        0..=99 => (1, "Beginner"),
        100..=299 => (2, "Novice Writer"),
        300..=599 => (3, "Aspiring Writer"),
        600..=999 => (4, "Dedicated Journaler"),
        1000..=1499 => (5, "Committed Writer"),
        1500..=2499 => (6, "Experienced Journaler"),
        2500..=3999 => (7, "Prolific Writer"),
        4000..=5999 => (8, "Master Journaler"),
        6000..=8999 => (9, "Expert Writer"),
        _ => (10, "Legendary Journaler"),
    }
}

/// Calculate word bonus points
pub fn calculate_word_bonus(word_count: i64) -> i64 {
    if word_count >= 500 {
        POINTS_WORD_BONUS_500
    } else if word_count >= 300 {
        POINTS_WORD_BONUS_300
    } else if word_count >= 100 {
        POINTS_WORD_BONUS_100
    } else {
        0
    }
}

/// Get all achievement definitions
pub fn get_achievement_definitions() -> Vec<Achievement> {
    vec![
        Achievement {
            id: "first_entry".to_string(),
            name: "First Steps".to_string(),
            description: "Write your first journal entry".to_string(),
            icon: "PenLine".to_string(),
            points: 50,
            unlocked: false,
            unlocked_at: None,
            category: "entries".to_string(),
            requirement: 1,
            progress: None,
        },
        Achievement {
            id: "streak_3".to_string(),
            name: "Getting Started".to_string(),
            description: "Maintain a 3-day writing streak".to_string(),
            icon: "Flame".to_string(),
            points: 25,
            unlocked: false,
            unlocked_at: None,
            category: "streaks".to_string(),
            requirement: 3,
            progress: None,
        },
        Achievement {
            id: "streak_7".to_string(),
            name: "Week Warrior".to_string(),
            description: "Maintain a 7-day writing streak".to_string(),
            icon: "Flame".to_string(),
            points: 75,
            unlocked: false,
            unlocked_at: None,
            category: "streaks".to_string(),
            requirement: 7,
            progress: None,
        },
        Achievement {
            id: "streak_30".to_string(),
            name: "Monthly Master".to_string(),
            description: "Maintain a 30-day writing streak".to_string(),
            icon: "Trophy".to_string(),
            points: 300,
            unlocked: false,
            unlocked_at: None,
            category: "streaks".to_string(),
            requirement: 30,
            progress: None,
        },
        Achievement {
            id: "streak_100".to_string(),
            name: "Century Writer".to_string(),
            description: "Maintain a 100-day writing streak".to_string(),
            icon: "Crown".to_string(),
            points: 1000,
            unlocked: false,
            unlocked_at: None,
            category: "streaks".to_string(),
            requirement: 100,
            progress: None,
        },
        Achievement {
            id: "entries_10".to_string(),
            name: "Regular Writer".to_string(),
            description: "Write 10 journal entries".to_string(),
            icon: "BookOpen".to_string(),
            points: 50,
            unlocked: false,
            unlocked_at: None,
            category: "entries".to_string(),
            requirement: 10,
            progress: None,
        },
        Achievement {
            id: "entries_50".to_string(),
            name: "Seasoned Journaler".to_string(),
            description: "Write 50 journal entries".to_string(),
            icon: "BookOpen".to_string(),
            points: 150,
            unlocked: false,
            unlocked_at: None,
            category: "entries".to_string(),
            requirement: 50,
            progress: None,
        },
        Achievement {
            id: "entries_100".to_string(),
            name: "Centurion".to_string(),
            description: "Write 100 journal entries".to_string(),
            icon: "Award".to_string(),
            points: 500,
            unlocked: false,
            unlocked_at: None,
            category: "entries".to_string(),
            requirement: 100,
            progress: None,
        },
        Achievement {
            id: "words_500".to_string(),
            name: "Wordsmith".to_string(),
            description: "Write 500 words total".to_string(),
            icon: "FileText".to_string(),
            points: 25,
            unlocked: false,
            unlocked_at: None,
            category: "words".to_string(),
            requirement: 500,
            progress: None,
        },
        Achievement {
            id: "words_1000".to_string(),
            name: "Essay Writer".to_string(),
            description: "Write 1,000 words total".to_string(),
            icon: "FileText".to_string(),
            points: 75,
            unlocked: false,
            unlocked_at: None,
            category: "words".to_string(),
            requirement: 1000,
            progress: None,
        },
        Achievement {
            id: "insights_5".to_string(),
            name: "Curious Mind".to_string(),
            description: "Request 5 AI insights".to_string(),
            icon: "Brain".to_string(),
            points: 50,
            unlocked: false,
            unlocked_at: None,
            category: "ai".to_string(),
            requirement: 5,
            progress: None,
        },
        Achievement {
            id: "insights_20".to_string(),
            name: "Deep Thinker".to_string(),
            description: "Request 20 AI insights".to_string(),
            icon: "Brain".to_string(),
            points: 150,
            unlocked: false,
            unlocked_at: None,
            category: "ai".to_string(),
            requirement: 20,
            progress: None,
        },
        Achievement {
            id: "prompts_10".to_string(),
            name: "Prompt Explorer".to_string(),
            description: "Use 10 writing prompts".to_string(),
            icon: "Lightbulb".to_string(),
            points: 75,
            unlocked: false,
            unlocked_at: None,
            category: "prompts".to_string(),
            requirement: 10,
            progress: None,
        },
        Achievement {
            id: "mood_positive".to_string(),
            name: "Positive Vibes".to_string(),
            description: "Have 5 entries with positive sentiment".to_string(),
            icon: "Smile".to_string(),
            points: 50,
            unlocked: false,
            unlocked_at: None,
            category: "mood".to_string(),
            requirement: 5,
            progress: None,
        },
        Achievement {
            id: "level_5".to_string(),
            name: "Committed Writer".to_string(),
            description: "Reach level 5".to_string(),
            icon: "Star".to_string(),
            points: 100,
            unlocked: false,
            unlocked_at: None,
            category: "levels".to_string(),
            requirement: 5,
            progress: None,
        },
    ]
}

/// Default stats for a new user
impl Default for GamificationStats {
    fn default() -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        Self {
            user_id: String::new(),
            tenant_id: String::new(),
            points_balance: 0,
            lifetime_points: 0,
            level: 1,
            level_title: "Beginner".to_string(),
            current_streak: 0,
            longest_streak: 0,
            last_entry_date: None,
            achievements: get_achievement_definitions(),
            total_entries: 0,
            total_words: 0,
            insights_requested: 0,
            prompts_used: 0,
            created_at: now.clone(),
            updated_at: now,
        }
    }
}
