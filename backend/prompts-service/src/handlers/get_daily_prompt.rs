pub async fn get_daily_prompt(
    event: ApiGatewayEvent,
    db_client: &DynamoDbClient,
) -> Result<ApiGatewayResponse, Error> {
    let user_id = extract_user_id(&event)?;
    
    // Get user's prompt history
    let prompt_history = get_user_prompt_history(user_id, db_client).await?;
    
    // Get user preferences from settings service
    let user_settings = get_user_settings(user_id).await?;
    
    // Build query based on user preferences and history
    let query = PromptQuery {
        category: user_settings.preferred_prompt_categories,
        tags: user_settings.preferred_prompt_tags,
        mood: user_settings.current_mood,
        difficulty: user_settings.prompt_difficulty,
        exclude_ids: Some(prompt_history.recently_shown), // Don't repeat recent prompts
    };
    
    // Get personalized prompt
    let prompts = get_prompts(query, db_client).await?;
    
    // Select one prompt, prioritizing variety
    let selected_prompt = select_prompt_with_variety(prompts, &prompt_history)?;
    
    // Record that this prompt was shown
    update_prompt_history(user_id, selected_prompt.id.clone(), db_client).await?;
    
    // Return the selected prompt
    Ok(ApiGatewayResponse::success(selected_prompt))
}

fn select_prompt_with_variety(
    prompts: Vec<Prompt>,
    history: &PromptHistory,
) -> Result<Prompt, Error> {
    // Prioritize different categories than recently shown
    // Use weighted randomization to favor variety
    // Consider user's writing patterns from history
} 