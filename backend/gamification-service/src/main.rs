use aws_lambda_events::apigw::{ApiGatewayProxyRequest, ApiGatewayProxyResponse};
use aws_lambda_events::eventbridge::EventBridgeEvent;
use aws_sdk_dynamodb::types::AttributeValue;
use journal_common::{
    chrono, error_response, extract_tenant_context, gamification::*, get_dynamo_client,
    json_response, lambda_runtime::{self, service_fn, Error, LambdaEvent}, serde_json, tracing,
    tracing_subscriber, uuid, JournalError, JwtClaims,
};
use serde::Deserialize;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .with_target(false)
        .without_time()
        .init();

    lambda_runtime::run(service_fn(handler)).await
}

async fn handler(event: LambdaEvent<serde_json::Value>) -> Result<ApiGatewayProxyResponse, Error> {
    let (payload, _context) = event.into_parts();

    // Try to parse as HTTP request first
    if let Ok(http_event) = serde_json::from_value::<ApiGatewayProxyRequest>(payload.clone()) {
        return handle_http_request(http_event).await;
    }

    // Otherwise try EventBridge
    if let Ok(eb_event) = serde_json::from_value::<EventBridgeEvent<serde_json::Value>>(payload) {
        return handle_eventbridge_event(eb_event).await;
    }

    Ok(error_response(
        400,
        &JournalError::ValidationError("Unknown event type".into()),
    ))
}

async fn handle_http_request(
    event: ApiGatewayProxyRequest,
) -> Result<ApiGatewayProxyResponse, Error> {
    let path = event.path.clone().unwrap_or_default();
    let method = event.http_method.as_str();

    tracing::info!("HTTP Request: {} {}", method, path);

    // Extract tenant context
    let claims = match extract_tenant_context(&event.headers).await {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Auth error: {:?}", e);
            return Ok(error_response(401, &e));
        }
    };

    match (method, path.as_str()) {
        ("GET", p) if p.ends_with("/stats") => get_stats(&claims).await,
        ("GET", p) if p.ends_with("/transactions") => get_transactions(&claims, &event).await,
        ("GET", p) if p.ends_with("/achievements") => get_achievements(&claims).await,
        _ => Ok(error_response(
            404,
            &JournalError::NotFoundError("Route not found".into()),
        )),
    }
}

async fn handle_eventbridge_event(
    event: EventBridgeEvent<serde_json::Value>,
) -> Result<ApiGatewayProxyResponse, Error> {
    let detail_type = event.detail_type.clone();
    tracing::info!("EventBridge event: {:?}", detail_type);

    match detail_type.as_str() {
        "EntryCreated" => process_entry_created(Some(event.detail)).await,
        "EntryUpdated" => process_entry_updated(Some(event.detail)).await,
        "EntryDeleted" => process_entry_deleted(Some(event.detail)).await,
        "AIInsightRequested" => process_ai_insight(Some(event.detail)).await,
        "PromptUsed" => process_prompt_used(Some(event.detail)).await,
        _ => {
            tracing::warn!("Unknown event type: {}", detail_type);
            Ok(json_response(200, &serde_json::json!({"status": "ignored"})))
        }
    }
}

/// GET /gamification/stats - Get user's gamification stats
async fn get_stats(claims: &JwtClaims) -> Result<ApiGatewayProxyResponse, Error> {
    let client = get_dynamo_client().await;
    let table = env::var("GAMIFICATION_TABLE").unwrap_or_else(|_| "GamificationTable".to_string());

    // Try to get existing stats
    let result = client
        .get_item()
        .table_name(&table)
        .key("pk", AttributeValue::S(format!("USER#{}", claims.sub)))
        .key("sk", AttributeValue::S("STATS".to_string()))
        .send()
        .await;

    match result {
        Ok(output) => {
            if let Some(item) = output.item {
                let stats = item_to_stats(item, &claims.sub, &claims.tenant_id);
                Ok(json_response(200, &stats))
            } else {
                // Return default stats for new user
                let mut stats = GamificationStats::default();
                stats.user_id = claims.sub.clone();
                stats.tenant_id = claims.tenant_id.clone();
                Ok(json_response(200, &stats))
            }
        }
        Err(e) => {
            tracing::error!("DynamoDB error: {:?}", e);
            Ok(error_response(
                500,
                &JournalError::DatabaseError(e.to_string()),
            ))
        }
    }
}

/// GET /gamification/transactions - Get recent point transactions
async fn get_transactions(
    claims: &JwtClaims,
    event: &ApiGatewayProxyRequest,
) -> Result<ApiGatewayProxyResponse, Error> {
    let client = get_dynamo_client().await;
    let table = env::var("GAMIFICATION_TABLE").unwrap_or_else(|_| "GamificationTable".to_string());

    let limit: i32 = event
        .query_string_parameters
        .first("limit")
        .and_then(|l| l.parse().ok())
        .unwrap_or(20);

    let result = client
        .query()
        .table_name(&table)
        .key_condition_expression("pk = :pk AND begins_with(sk, :sk_prefix)")
        .expression_attribute_values(":pk", AttributeValue::S(format!("USER#{}", claims.sub)))
        .expression_attribute_values(":sk_prefix", AttributeValue::S("TXN#".to_string()))
        .scan_index_forward(false) // Most recent first
        .limit(limit)
        .send()
        .await;

    match result {
        Ok(output) => {
            let transactions: Vec<PointTransaction> = output
                .items
                .unwrap_or_default()
                .into_iter()
                .filter_map(|item| item_to_transaction(item, &claims.sub, &claims.tenant_id))
                .collect();

            Ok(json_response(200, &transactions))
        }
        Err(e) => {
            tracing::error!("DynamoDB error: {:?}", e);
            Ok(error_response(
                500,
                &JournalError::DatabaseError(e.to_string()),
            ))
        }
    }
}

/// GET /gamification/achievements - Get all achievements with progress
async fn get_achievements(claims: &JwtClaims) -> Result<ApiGatewayProxyResponse, Error> {
    // Get stats to populate achievement progress
    let client = get_dynamo_client().await;
    let table = env::var("GAMIFICATION_TABLE").unwrap_or_else(|_| "GamificationTable".to_string());

    let result = client
        .get_item()
        .table_name(&table)
        .key("pk", AttributeValue::S(format!("USER#{}", claims.sub)))
        .key("sk", AttributeValue::S("STATS".to_string()))
        .send()
        .await;

    let stats = match result {
        Ok(output) => output
            .item
            .map(|item| item_to_stats(item, &claims.sub, &claims.tenant_id))
            .unwrap_or_else(|| {
                let mut s = GamificationStats::default();
                s.user_id = claims.sub.clone();
                s.tenant_id = claims.tenant_id.clone();
                s
            }),
        Err(_) => {
            let mut s = GamificationStats::default();
            s.user_id = claims.sub.clone();
            s.tenant_id = claims.tenant_id.clone();
            s
        }
    };

    Ok(json_response(200, &stats.achievements))
}

/// Process EntryCreated event - award points for new entry
async fn process_entry_created(
    detail: Option<serde_json::Value>,
) -> Result<ApiGatewayProxyResponse, Error> {
    let detail = match detail {
        Some(d) => d,
        None => {
            return Ok(json_response(
                200,
                &serde_json::json!({"status": "no_detail"}),
            ))
        }
    };

    let entry: EntryEvent = match serde_json::from_value(detail) {
        Ok(e) => e,
        Err(e) => {
            tracing::error!("Failed to parse entry event: {:?}", e);
            return Ok(json_response(
                200,
                &serde_json::json!({"status": "parse_error"}),
            ));
        }
    };

    let client = get_dynamo_client().await;
    let table = env::var("GAMIFICATION_TABLE").unwrap_or_else(|_| "GamificationTable".to_string());
    let now = chrono::Utc::now();

    // Get or create stats
    let mut stats = get_or_create_stats(&client, &table, &entry.user_id, &entry.tenant_id).await?;

    // Calculate points to award
    let mut points_earned = POINTS_ENTRY_CREATED;
    let word_bonus = calculate_word_bonus(entry.word_count);
    points_earned += word_bonus;

    // Check if first entry of day
    let today = now.format("%Y-%m-%d").to_string();
    let is_first_today = stats
        .last_entry_date
        .as_ref()
        .map(|d| d != &today)
        .unwrap_or(true);

    if is_first_today {
        points_earned += POINTS_FIRST_ENTRY_OF_DAY;
    }

    // Update streak
    if let Some(last_date) = &stats.last_entry_date {
        let yesterday = (now - chrono::Duration::days(1))
            .format("%Y-%m-%d")
            .to_string();
        if last_date == &yesterday {
            stats.current_streak += 1;
            points_earned += POINTS_STREAK_CONTINUED;

            // Streak milestones
            if stats.current_streak == 7 {
                points_earned += POINTS_STREAK_7_DAYS;
            } else if stats.current_streak == 30 {
                points_earned += POINTS_STREAK_30_DAYS;
            }
        } else if last_date != &today {
            stats.current_streak = 1;
        }
    } else {
        stats.current_streak = 1;
    }

    // Update stats
    stats.points_balance += points_earned;
    stats.lifetime_points += points_earned;
    stats.total_entries += 1;
    stats.total_words += entry.word_count;
    stats.last_entry_date = Some(today);

    if stats.current_streak > stats.longest_streak {
        stats.longest_streak = stats.current_streak;
    }

    let (level, title) = get_level_from_points(stats.lifetime_points);
    stats.level = level;
    stats.level_title = title.to_string();
    stats.updated_at = now.to_rfc3339();

    // Check and update achievements
    update_achievements(&mut stats);

    // Save updated stats
    save_stats(&client, &table, &stats).await?;

    // Record transaction
    record_transaction(
        &client,
        &table,
        &entry.user_id,
        &entry.tenant_id,
        "entry_created",
        points_earned,
        format!("Created entry with {} words", entry.word_count),
    )
    .await?;

    tracing::info!(
        "Awarded {} points to user {} for entry creation",
        points_earned,
        entry.user_id
    );

    Ok(json_response(
        200,
        &serde_json::json!({"status": "success", "points_awarded": points_earned}),
    ))
}

/// Process EntryUpdated event
async fn process_entry_updated(
    _detail: Option<serde_json::Value>,
) -> Result<ApiGatewayProxyResponse, Error> {
    // For updates, we don't award additional points - just acknowledge
    tracing::info!("Entry updated event received");
    Ok(json_response(
        200,
        &serde_json::json!({"status": "acknowledged"}),
    ))
}

/// Process EntryDeleted event
async fn process_entry_deleted(
    _detail: Option<serde_json::Value>,
) -> Result<ApiGatewayProxyResponse, Error> {
    // For deletes, we might want to adjust stats but not deduct points
    tracing::info!("Entry deleted event received");
    Ok(json_response(
        200,
        &serde_json::json!({"status": "acknowledged"}),
    ))
}

/// Process AI insight request
async fn process_ai_insight(
    detail: Option<serde_json::Value>,
) -> Result<ApiGatewayProxyResponse, Error> {
    let detail = match detail {
        Some(d) => d,
        None => {
            return Ok(json_response(
                200,
                &serde_json::json!({"status": "no_detail"}),
            ))
        }
    };

    #[derive(Deserialize)]
    struct InsightEvent {
        user_id: String,
        tenant_id: String,
    }

    let event: InsightEvent = match serde_json::from_value(detail) {
        Ok(e) => e,
        Err(_) => {
            return Ok(json_response(
                200,
                &serde_json::json!({"status": "parse_error"}),
            ))
        }
    };

    let client = get_dynamo_client().await;
    let table = env::var("GAMIFICATION_TABLE").unwrap_or_else(|_| "GamificationTable".to_string());

    let mut stats = get_or_create_stats(&client, &table, &event.user_id, &event.tenant_id).await?;

    stats.points_balance += POINTS_AI_INSIGHTS;
    stats.lifetime_points += POINTS_AI_INSIGHTS;
    stats.insights_requested += 1;
    stats.updated_at = chrono::Utc::now().to_rfc3339();

    update_achievements(&mut stats);
    save_stats(&client, &table, &stats).await?;

    record_transaction(
        &client,
        &table,
        &event.user_id,
        &event.tenant_id,
        "ai_insight",
        POINTS_AI_INSIGHTS,
        "Requested AI insight".to_string(),
    )
    .await?;

    Ok(json_response(
        200,
        &serde_json::json!({"status": "success", "points_awarded": POINTS_AI_INSIGHTS}),
    ))
}

/// Process prompt used event
async fn process_prompt_used(
    detail: Option<serde_json::Value>,
) -> Result<ApiGatewayProxyResponse, Error> {
    let detail = match detail {
        Some(d) => d,
        None => {
            return Ok(json_response(
                200,
                &serde_json::json!({"status": "no_detail"}),
            ))
        }
    };

    #[derive(Deserialize)]
    struct PromptEvent {
        user_id: String,
        tenant_id: String,
    }

    let event: PromptEvent = match serde_json::from_value(detail) {
        Ok(e) => e,
        Err(_) => {
            return Ok(json_response(
                200,
                &serde_json::json!({"status": "parse_error"}),
            ))
        }
    };

    let client = get_dynamo_client().await;
    let table = env::var("GAMIFICATION_TABLE").unwrap_or_else(|_| "GamificationTable".to_string());

    let mut stats = get_or_create_stats(&client, &table, &event.user_id, &event.tenant_id).await?;

    stats.points_balance += POINTS_PROMPT_USED;
    stats.lifetime_points += POINTS_PROMPT_USED;
    stats.prompts_used += 1;
    stats.updated_at = chrono::Utc::now().to_rfc3339();

    update_achievements(&mut stats);
    save_stats(&client, &table, &stats).await?;

    record_transaction(
        &client,
        &table,
        &event.user_id,
        &event.tenant_id,
        "prompt_used",
        POINTS_PROMPT_USED,
        "Used writing prompt".to_string(),
    )
    .await?;

    Ok(json_response(
        200,
        &serde_json::json!({"status": "success", "points_awarded": POINTS_PROMPT_USED}),
    ))
}

// Helper functions

async fn get_or_create_stats(
    client: &aws_sdk_dynamodb::Client,
    table: &str,
    user_id: &str,
    tenant_id: &str,
) -> Result<GamificationStats, Error> {
    let result = client
        .get_item()
        .table_name(table)
        .key("pk", AttributeValue::S(format!("USER#{}", user_id)))
        .key("sk", AttributeValue::S("STATS".to_string()))
        .send()
        .await;

    match result {
        Ok(output) => {
            if let Some(item) = output.item {
                Ok(item_to_stats(item, user_id, tenant_id))
            } else {
                let mut stats = GamificationStats::default();
                stats.user_id = user_id.to_string();
                stats.tenant_id = tenant_id.to_string();
                Ok(stats)
            }
        }
        Err(e) => {
            tracing::error!("Failed to get stats: {:?}", e);
            let mut stats = GamificationStats::default();
            stats.user_id = user_id.to_string();
            stats.tenant_id = tenant_id.to_string();
            Ok(stats)
        }
    }
}

async fn save_stats(
    client: &aws_sdk_dynamodb::Client,
    table: &str,
    stats: &GamificationStats,
) -> Result<(), Error> {
    let achievements_json = serde_json::to_string(&stats.achievements).unwrap_or_default();

    client
        .put_item()
        .table_name(table)
        .item("pk", AttributeValue::S(format!("USER#{}", stats.user_id)))
        .item("sk", AttributeValue::S("STATS".to_string()))
        .item("tenant_id", AttributeValue::S(stats.tenant_id.clone()))
        .item(
            "points_balance",
            AttributeValue::N(stats.points_balance.to_string()),
        )
        .item(
            "lifetime_points",
            AttributeValue::N(stats.lifetime_points.to_string()),
        )
        .item("level", AttributeValue::N(stats.level.to_string()))
        .item("level_title", AttributeValue::S(stats.level_title.clone()))
        .item(
            "current_streak",
            AttributeValue::N(stats.current_streak.to_string()),
        )
        .item(
            "longest_streak",
            AttributeValue::N(stats.longest_streak.to_string()),
        )
        .item(
            "last_entry_date",
            stats
                .last_entry_date
                .as_ref()
                .map(|d| AttributeValue::S(d.clone()))
                .unwrap_or(AttributeValue::Null(true)),
        )
        .item("achievements", AttributeValue::S(achievements_json))
        .item(
            "total_entries",
            AttributeValue::N(stats.total_entries.to_string()),
        )
        .item(
            "total_words",
            AttributeValue::N(stats.total_words.to_string()),
        )
        .item(
            "insights_requested",
            AttributeValue::N(stats.insights_requested.to_string()),
        )
        .item(
            "prompts_used",
            AttributeValue::N(stats.prompts_used.to_string()),
        )
        .item("created_at", AttributeValue::S(stats.created_at.clone()))
        .item("updated_at", AttributeValue::S(stats.updated_at.clone()))
        .send()
        .await
        .map_err(|e| {
            tracing::error!("Failed to save stats: {:?}", e);
            Error::from(e.to_string())
        })?;

    Ok(())
}

async fn record_transaction(
    client: &aws_sdk_dynamodb::Client,
    table: &str,
    user_id: &str,
    tenant_id: &str,
    action: &str,
    points: i64,
    description: String,
) -> Result<(), Error> {
    let now = chrono::Utc::now();
    let txn_id = uuid::Uuid::new_v4().to_string();

    client
        .put_item()
        .table_name(table)
        .item("pk", AttributeValue::S(format!("USER#{}", user_id)))
        .item(
            "sk",
            AttributeValue::S(format!("TXN#{}", now.to_rfc3339())),
        )
        .item("txn_id", AttributeValue::S(txn_id))
        .item("tenant_id", AttributeValue::S(tenant_id.to_string()))
        .item("action", AttributeValue::S(action.to_string()))
        .item("points", AttributeValue::N(points.to_string()))
        .item("description", AttributeValue::S(description))
        .item("created_at", AttributeValue::S(now.to_rfc3339()))
        .send()
        .await
        .map_err(|e| {
            tracing::error!("Failed to record transaction: {:?}", e);
            Error::from(e.to_string())
        })?;

    Ok(())
}

fn item_to_stats(
    item: std::collections::HashMap<String, AttributeValue>,
    user_id: &str,
    tenant_id: &str,
) -> GamificationStats {
    let get_n = |key: &str| -> i64 {
        item.get(key)
            .and_then(|v| v.as_n().ok())
            .and_then(|n| n.parse().ok())
            .unwrap_or(0)
    };

    let get_i32 = |key: &str| -> i32 {
        item.get(key)
            .and_then(|v| v.as_n().ok())
            .and_then(|n| n.parse().ok())
            .unwrap_or(0)
    };

    let get_s = |key: &str| -> String {
        item.get(key)
            .and_then(|v| v.as_s().ok())
            .cloned()
            .unwrap_or_default()
    };

    let achievements: Vec<Achievement> = item
        .get("achievements")
        .and_then(|v| v.as_s().ok())
        .and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or_else(get_achievement_definitions);

    GamificationStats {
        user_id: user_id.to_string(),
        tenant_id: tenant_id.to_string(),
        points_balance: get_n("points_balance"),
        lifetime_points: get_n("lifetime_points"),
        level: get_i32("level").max(1),
        level_title: get_s("level_title"),
        current_streak: get_i32("current_streak"),
        longest_streak: get_i32("longest_streak"),
        last_entry_date: item
            .get("last_entry_date")
            .and_then(|v| v.as_s().ok())
            .cloned(),
        achievements,
        total_entries: get_i32("total_entries"),
        total_words: get_n("total_words"),
        insights_requested: get_i32("insights_requested"),
        prompts_used: get_i32("prompts_used"),
        created_at: get_s("created_at"),
        updated_at: get_s("updated_at"),
    }
}

fn item_to_transaction(
    item: std::collections::HashMap<String, AttributeValue>,
    user_id: &str,
    tenant_id: &str,
) -> Option<PointTransaction> {
    let get_s = |key: &str| -> Option<String> {
        item.get(key).and_then(|v| v.as_s().ok()).cloned()
    };

    let get_n = |key: &str| -> i64 {
        item.get(key)
            .and_then(|v| v.as_n().ok())
            .and_then(|n| n.parse().ok())
            .unwrap_or(0)
    };

    Some(PointTransaction {
        id: get_s("txn_id")?,
        user_id: user_id.to_string(),
        tenant_id: tenant_id.to_string(),
        action: get_s("action")?,
        points: get_n("points"),
        description: get_s("description").unwrap_or_default(),
        created_at: get_s("created_at")?,
        metadata: None,
    })
}

fn update_achievements(stats: &mut GamificationStats) {
    let now = chrono::Utc::now().to_rfc3339();

    for achievement in &mut stats.achievements {
        if achievement.unlocked {
            continue;
        }

        let progress = match achievement.id.as_str() {
            "first_entry" => stats.total_entries,
            "streak_3" | "streak_7" | "streak_30" | "streak_100" => stats.current_streak,
            "entries_10" | "entries_50" | "entries_100" => stats.total_entries,
            "words_500" | "words_1000" => stats.total_words as i32,
            "insights_5" | "insights_20" => stats.insights_requested,
            "prompts_10" => stats.prompts_used,
            "level_5" => stats.level,
            _ => 0,
        };

        achievement.progress = Some(progress);

        if progress >= achievement.requirement {
            achievement.unlocked = true;
            achievement.unlocked_at = Some(now.clone());
            // Add achievement points
            stats.points_balance += achievement.points as i64;
            stats.lifetime_points += achievement.points as i64;
            tracing::info!("Achievement unlocked: {}", achievement.id);
        }
    }
}
