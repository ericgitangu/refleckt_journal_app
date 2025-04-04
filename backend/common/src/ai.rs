// AI Module for journal-common
// This module is conditionally compiled when ai-features is enabled

#[cfg(feature = "ai-features")]
use rust_bert::pipelines::sentiment::{SentimentModel, SentimentPolarity};

/// Result of AI sentiment analysis
pub struct SentimentAnalysis {
    pub sentiment: String,        // positive, negative, neutral
    pub score: f32,               // -1.0 to 1.0 sentiment score
    pub confidence: Option<f32>,  // confidence level if available
}

/// Result of AI keyword extraction
pub struct KeywordAnalysis {
    pub keywords: Vec<String>,
    pub categories: Vec<String>,
}

/// Result of AI insights generation
pub struct InsightAnalysis {
    pub insights: Option<String>,
    pub reflections: Option<String>,
}

/// Comprehensive AI analysis result
pub struct EntryAnalysis {
    pub sentiment: SentimentAnalysis,
    pub keywords: KeywordAnalysis,
    pub insights: InsightAnalysis,
}

/// Extract keywords from text using basic frequency analysis
/// Used when AI features are not available
pub fn extract_keywords_basic(text: &str, max_keywords: usize) -> Vec<String> {
    // Simple keyword extraction using word frequency
    let words: Vec<String> = text
        .split_whitespace()
        .map(|w| w.to_lowercase().trim_matches(|c: char| !c.is_alphanumeric()).to_string())
        .filter(|w| w.len() > 4) // Only consider longer words
        .collect();
    
    // Count word frequencies
    let mut word_counts: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    for word in words {
        *word_counts.entry(word).or_insert(0) += 1;
    }
    
    // Sort by frequency and take top keywords
    let mut sorted_words: Vec<(String, usize)> = word_counts.into_iter().collect();
    sorted_words.sort_by(|a, b| b.1.cmp(&a.1));
    
    sorted_words.iter()
        .take(max_keywords)
        .map(|(word, _)| word.clone())
        .collect()
}

#[cfg(feature = "ai-features")]
pub fn analyze_sentiment(text: &str) -> anyhow::Result<SentimentAnalysis> {
    // Load the sentiment analysis model
    let sentiment_model = SentimentModel::new(Default::default())?;
    
    // Analyze sentiment
    let sentiments = sentiment_model.predict(&[text]);
    
    // Convert the sentiment polarity to a string and score
    let (sentiment, score) = match sentiments[0] {
        SentimentPolarity::Positive => ("positive".to_string(), 0.75),
        SentimentPolarity::Negative => ("negative".to_string(), -0.75),
        SentimentPolarity::Neutral => ("neutral".to_string(), 0.0),
    };
    
    Ok(SentimentAnalysis {
        sentiment,
        score,
        confidence: Some(0.85), // Fixed confidence as rust-bert doesn't provide this
    })
}

#[cfg(feature = "ai-features")]
pub fn extract_keywords(text: &str, max_keywords: usize) -> anyhow::Result<Vec<String>> {
    // For now, we'll use the same basic extraction method
    // In a real implementation, this would use more sophisticated NLP models from rust-bert
    let keywords = extract_keywords_basic(text, max_keywords);
    Ok(keywords)
}

#[cfg(feature = "ai-features")]
pub fn analyze_entry(title: &str, content: &str) -> anyhow::Result<EntryAnalysis> {
    // Combine title and content for analysis
    let full_text = format!("{}\n{}", title, content);
    
    // Get sentiment analysis
    let sentiment = analyze_sentiment(&full_text)?;
    
    // Extract keywords
    let keywords = extract_keywords(&full_text, 5)?;
    
    // For categories and insights, we would use more sophisticated models
    // Here we're using simple placeholders
    let categories = vec!["journal".to_string(), "personal".to_string()];
    
    Ok(EntryAnalysis {
        sentiment,
        keywords: KeywordAnalysis {
            keywords,
            categories,
        },
        insights: InsightAnalysis {
            insights: Some("This entry reflects personal thoughts and experiences.".to_string()),
            reflections: Some("Consider exploring how these experiences connect to your goals.".to_string()),
        },
    })
}

// Common interface for both implementations
pub fn analyze_text(title: &str, content: &str) -> EntryAnalysis {
    #[cfg(feature = "ai-features")]
    {
        analyze_entry(title, content).unwrap_or_else(|_| {
            // Fallback if AI analysis fails
            EntryAnalysis {
                sentiment: SentimentAnalysis {
                    sentiment: "neutral".to_string(),
                    score: 0.0,
                    confidence: None,
                },
                keywords: KeywordAnalysis {
                    keywords: extract_keywords_basic(&format!("{}\n{}", title, content), 5),
                    categories: vec!["general".to_string(), "journal".to_string()],
                },
                insights: InsightAnalysis {
                    insights: Some("This is a journal entry about various thoughts and experiences.".to_string()),
                    reflections: Some("What more would you like to explore about this topic?".to_string()),
                },
            }
        })
    }
    
    #[cfg(not(feature = "ai-features"))]
    {
        // Use the simplified analysis when ai-features are not enabled
        EntryAnalysis {
            sentiment: SentimentAnalysis {
                sentiment: "neutral".to_string(),
                score: 0.0,
                confidence: None,
            },
            keywords: KeywordAnalysis {
                keywords: extract_keywords_basic(&format!("{}\n{}", title, content), 5),
                categories: vec!["general".to_string(), "journal".to_string()],
            },
            insights: InsightAnalysis {
                insights: Some("This is a journal entry about various thoughts and experiences.".to_string()),
                reflections: Some("What more would you like to explore about this topic?".to_string()),
            },
        }
    }
} 