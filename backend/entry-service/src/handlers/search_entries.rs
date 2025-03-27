pub async fn search_entries(
    event: ApiGatewayEvent,
    db_client: &DynamoDbClient,
) -> Result<ApiGatewayResponse, Error> {
    let user_id = extract_user_id(&event)?;
    let query_params = extract_query_params(&event)?;
    
    // Parse search parameters
    let search_query = SearchQuery {
        text: query_params.get("text").cloned(),
        tags: parse_tags(query_params.get("tags")),
        date_range: parse_date_range(
            query_params.get("from_date"), 
            query_params.get("to_date")
        ),
        mood: query_params.get("mood").cloned(),
        sort_by: query_params.get("sort_by").cloned().unwrap_or("date_desc".to_string()),
        limit: parse_limit(query_params.get("limit")),
    };
    
    // Implement full-text search for entry content
    // Consider using a search index for better performance
    let entries = search_entries_by_criteria(user_id, search_query, db_client).await?;
    
    Ok(ApiGatewayResponse::success(entries))
} 