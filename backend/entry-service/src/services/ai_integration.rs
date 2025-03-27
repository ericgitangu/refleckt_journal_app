pub async fn send_entry_for_analysis(
    entry: &Entry,
    user_id: &str,
    client: &Client,
    ai_service_url: &str,
) -> Result<(), Error> {
    // Build analysis request
    let analysis_request = AnalysisRequest {
        entry_id: entry.id.clone(),
        user_id: user_id.to_string(),
        content: entry.content.clone(),
        tags: entry.tags.clone(),
        mood: entry.mood.clone(),
        created_at: entry.created_at.clone(),
    };
    
    // Send to AI service for async processing
    client.post(ai_service_url)
        .json(&analysis_request)
        .send()
        .await?;
        
    Ok(())
} 