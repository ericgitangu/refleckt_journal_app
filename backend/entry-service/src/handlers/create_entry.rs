pub async fn create_entry(
    event: ApiGatewayEvent,
    db_client: &DynamoDbClient,
    http_client: &Client,
    config: &Config,
) -> Result<ApiGatewayResponse, Error> {
    // Existing entry creation logic...
    
    // After creating entry, send for analysis if user has opted in
    let user_id = extract_user_id(&event)?;
    let user_settings = get_user_settings(user_id, db_client).await?;
    
    if user_settings.ai_insights_enabled {
        send_entry_for_analysis(&entry, user_id, http_client, &config.ai_service_url).await?;
    }
    
    // Return response
} 