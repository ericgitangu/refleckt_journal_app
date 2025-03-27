pub async fn get_writing_stats(
    event: ApiGatewayEvent,
    db_client: &DynamoDbClient,
) -> Result<ApiGatewayResponse, Error> {
    let user_id = extract_user_id(&event)?;
    let period = extract_period(&event)?; // "week", "month", "year", "all"
    
    // Calculate writing statistics
    let stats = calculate_writing_stats(user_id, period, db_client).await?;
    
    // Return comprehensive stats
    Ok(ApiGatewayResponse::success(stats))
}

pub struct WritingStats {
    current_streak: i32,
    longest_streak: i32,
    entries_count: i32,
    total_words: i32,
    avg_words_per_entry: f32,
    most_productive_day: String,
    most_used_tags: Vec<TagCount>,
    mood_distribution: HashMap<String, i32>,
    writing_time_distribution: HashMap<String, i32>, // Hour of day
} 