// Create a common client for all services to fetch user settings
pub async fn get_user_settings(
    user_id: &str,
    client: &Client,
    settings_url: &str,
) -> Result<UserSettings, Error> {
    let url = format!("{}/users/{}/settings", settings_url, user_id);
    
    let response = client.get(&url)
        .send()
        .await?
        .json::<UserSettings>()
        .await?;
        
    Ok(response)
} 