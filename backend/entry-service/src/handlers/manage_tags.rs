// Add endpoints for tag management
pub async fn get_user_tags(
    event: ApiGatewayEvent,
    db_client: &DynamoDbClient,
) -> Result<ApiGatewayResponse, Error> {
    let user_id = extract_user_id(&event)?;
    
    // Retrieve all tags used by the user
    // Count entries per tag for popularity metrics
    let tags_with_counts = get_user_tags_with_counts(user_id, db_client).await?;
    
    Ok(ApiGatewayResponse::success(tags_with_counts))
}

pub async fn suggest_tags(
    event: ApiGatewayEvent,
    db_client: &DynamoDbClient,
    ai_client: &Client,
) -> Result<ApiGatewayResponse, Error> {
    let body = extract_body::<SuggestTagsRequest>(&event)?;
    
    // Use AI service to suggest tags based on entry content
    let suggested_tags = request_tag_suggestions(
        &body.content, 
        &body.existing_tags, 
        ai_client
    ).await?;
    
    Ok(ApiGatewayResponse::success(suggested_tags))
} 