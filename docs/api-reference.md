# Reflekt Journal API Reference

This document provides a comprehensive reference for the Reflekt Journal API.

## Base URL

```
https://{API_GATEWAY_URL}.execute-api.{REGION}.amazonaws.com/{STAGE}
```

- `API_GATEWAY_URL`: Your API Gateway URL
- `REGION`: AWS region (e.g., us-east-1)
- `STAGE`: Deployment stage (dev, staging, prod)

## Authentication

All requests (except health checks) require authentication using a JWT token provided in the Authorization header:

```
Authorization: Bearer {TOKEN}
```

## Response Format

All responses follow a standard format:

- Success: HTTP 2XX with JSON response body
- Client Error: HTTP 4XX with error details
- Server Error: HTTP 5XX with error message

## Endpoints

### Health

#### Check Service Health

```
GET /health
```

**Response**:
```json
{
  "timestamp": "2023-03-23T10:00:00Z",
  "status": "healthy",
  "services": [
    {
      "name": "entry-service",
      "status": "healthy",
      "latency": 45
    },
    {
      "name": "settings-service",
      "status": "healthy",
      "latency": 38
    }
  ]
}
```

### Entries

#### List Entries

```
GET /entries
```

**Response**:
```json
[
  {
    "id": "abc123",
    "title": "My First Entry",
    "content": "Today was a good day...",
    "created_at": "2023-03-22T18:25:43Z",
    "updated_at": "2023-03-22T18:25:43Z",
    "category_id": "personal",
    "mood": 4,
    "tags": ["daily", "work"]
  }
]
```

#### Get Entry

```
GET /entries/{id}
```

**Response**:
```json
{
  "id": "abc123",
  "title": "My First Entry",
  "content": "Today was a good day...",
  "created_at": "2023-03-22T18:25:43Z",
  "updated_at": "2023-03-22T18:25:43Z",
  "category_id": "personal",
  "mood": 4,
  "tags": ["daily", "work"]
}
```

#### Create Entry

```
POST /entries
```

**Request**:
```json
{
  "title": "My New Entry",
  "content": "I learned something interesting today...",
  "category_id": "personal",
  "mood": 5,
  "tags": ["learning", "personal"]
}
```

**Response**:
```json
{
  "id": "def456",
  "title": "My New Entry",
  "content": "I learned something interesting today...",
  "created_at": "2023-03-23T10:15:22Z",
  "updated_at": "2023-03-23T10:15:22Z",
  "category_id": "personal",
  "mood": 5,
  "tags": ["learning", "personal"]
}
```

#### Update Entry

```
PUT /entries/{id}
```

**Request**:
```json
{
  "title": "Updated Entry Title",
  "content": "This is the updated content...",
  "mood": 3
}
```

**Response**:
```json
{
  "id": "abc123",
  "title": "Updated Entry Title",
  "content": "This is the updated content...",
  "created_at": "2023-03-22T18:25:43Z",
  "updated_at": "2023-03-23T11:30:15Z",
  "category_id": "personal",
  "mood": 3,
  "tags": ["daily", "work"]
}
```

#### Delete Entry

```
DELETE /entries/{id}
```

**Response**: HTTP 204 No Content

#### Search Entries

```
GET /entries/search?q={query}
```

**Response**:
```json
[
  {
    "id": "abc123",
    "title": "My First Entry",
    "content": "Today was a good day...",
    "created_at": "2023-03-22T18:25:43Z",
    "updated_at": "2023-03-22T18:25:43Z",
    "category_id": "personal",
    "mood": 4,
    "tags": ["daily", "work"]
  }
]
```

### Prompts

#### List All Prompts

```
GET /prompts
```

**Response**:
```json
{
  "prompts": [
    {
      "id": "prompt1",
      "text": "What are three things you're grateful for today?",
      "category": "Gratitude",
      "created_at": "2023-03-22T12:00:00Z",
      "tags": ["daily", "reflection"]
    },
    {
      "id": "prompt2",
      "text": "Describe a challenge you overcame this week.",
      "category": "Growth",
      "created_at": "2023-03-21T12:00:00Z",
      "tags": ["reflection", "achievement"]
    }
  ]
}
```

#### Get Daily Prompt

```
GET /prompts/daily
```

**Response**:
```json
{
  "prompt": {
    "id": "prompt1",
    "text": "What are three things you're grateful for today?",
    "category": "Gratitude",
    "created_at": "2023-03-22T12:00:00Z",
    "tags": ["daily", "reflection"]
  }
}
```

#### Get Random Prompt

```
GET /prompts/random
```

**Response**:
```json
{
  "prompt": {
    "id": "prompt2",
    "text": "Describe a challenge you overcame this week.",
    "category": "Growth",
    "created_at": "2023-03-21T12:00:00Z",
    "tags": ["reflection", "achievement"]
  }
}
```

#### Get Prompts by Category

```
GET /prompts/category/{category}
```

**Response**:
```json
{
  "prompts": [
    {
      "id": "prompt1",
      "text": "What are three things you're grateful for today?",
      "category": "Gratitude",
      "created_at": "2023-03-22T12:00:00Z",
      "tags": ["daily", "reflection"]
    }
  ]
}
```

#### Get Prompt by ID

```
GET /prompts/{id}
```

**Response**:
```json
{
  "prompt": {
    "id": "prompt1",
    "text": "What are three things you're grateful for today?",
    "category": "Gratitude",
    "created_at": "2023-03-22T12:00:00Z",
    "tags": ["daily", "reflection"]
  }
}
```

#### Create Prompt (Admin Only)

```
POST /prompts
```

**Request**:
```json
{
  "text": "If you could have dinner with anyone in history, who would it be and why?",
  "category": "Creativity",
  "tags": ["hypothetical", "fun"]
}
```

**Response**:
```json
{
  "prompt": {
    "id": "prompt3",
    "text": "If you could have dinner with anyone in history, who would it be and why?",
    "category": "Creativity",
    "created_at": "2023-03-23T14:30:00Z",
    "tags": ["hypothetical", "fun"]
  }
}
```

#### Update Prompt (Admin Only)

```
PUT /prompts/{id}
```

**Request**:
```json
{
  "text": "Updated prompt text",
  "tags": ["updated", "reflection"]
}
```

**Response**:
```json
{
  "prompt": {
    "id": "prompt1",
    "text": "Updated prompt text",
    "category": "Gratitude",
    "created_at": "2023-03-22T12:00:00Z",
    "tags": ["updated", "reflection"]
  }
}
```

#### Delete Prompt (Admin Only)

```
DELETE /prompts/{id}
```

**Response**: HTTP 204 No Content

### Settings

#### Get Categories

```
GET /settings/categories
```

**Response**:
```json
[
  {
    "id": "personal",
    "name": "Personal",
    "color": "#FF5733",
    "created_at": "2023-03-21T10:00:00Z",
    "updated_at": "2023-03-21T10:00:00Z"
  },
  {
    "id": "work",
    "name": "Work",
    "color": "#3358FF",
    "created_at": "2023-03-21T10:01:00Z",
    "updated_at": "2023-03-21T10:01:00Z"
  }
]
```

#### Create Category

```
POST /settings/categories
```

**Request**:
```json
{
  "name": "Health",
  "color": "#33FF57"
}
```

**Response**:
```json
{
  "id": "health",
  "name": "Health",
  "color": "#33FF57",
  "created_at": "2023-03-23T15:20:00Z",
  "updated_at": "2023-03-23T15:20:00Z"
}
```

#### Update Category

```
PUT /settings/categories/{id}
```

**Request**:
```json
{
  "name": "Personal Reflections",
  "color": "#FF9933"
}
```

**Response**:
```json
{
  "id": "personal",
  "name": "Personal Reflections",
  "color": "#FF9933",
  "created_at": "2023-03-21T10:00:00Z",
  "updated_at": "2023-03-23T16:15:00Z"
}
```

#### Delete Category

```
DELETE /settings/categories/{id}
```

**Response**: HTTP 204 No Content

#### Get Settings

```
GET /settings
```

**Response**:
```json
{
  "id": "user123-settings",
  "theme": "dark",
  "notifications_enabled": true,
  "ai_analysis_enabled": true,
  "created_at": "2023-03-21T09:00:00Z",
  "updated_at": "2023-03-22T14:30:00Z"
}
```

#### Update Settings

```
PUT /settings
```

**Request**:
```json
{
  "theme": "light",
  "notifications_enabled": false
}
```

**Response**:
```json
{
  "id": "user123-settings",
  "theme": "light",
  "notifications_enabled": false,
  "ai_analysis_enabled": true,
  "created_at": "2023-03-21T09:00:00Z",
  "updated_at": "2023-03-23T17:45:00Z"
}
```

### Analytics

#### Get Analytics

```
GET /analytics
```

**Response**:
```json
{
  "total_entries": 42,
  "top_categories": [
    { "name": "Personal", "count": 18 },
    { "name": "Work", "count": 15 }
  ],
  "mood_distribution": [
    { "mood": "1", "count": 3 },
    { "mood": "2", "count": 5 },
    { "mood": "3", "count": 10 },
    { "mood": "4", "count": 15 },
    { "mood": "5", "count": 9 }
  ],
  "activity_by_day": [
    { "day": "2023-03-17", "count": 2 },
    { "day": "2023-03-18", "count": 1 },
    { "day": "2023-03-19", "count": 3 }
  ]
}
```

#### Request Analytics

```
POST /analytics
```

**Response**:
```json
{
  "status": "processing",
  "job_id": "job123"
}
```

#### Get Mood Analytics

```
GET /analytics/mood
```

**Response**:
```json
{
  "moods": [
    { "date": "2023-03-17", "value": 4 },
    { "date": "2023-03-18", "value": 3 },
    { "date": "2023-03-19", "value": 5 }
  ]
}
```

## Error Codes

| HTTP Status | Description |
| ----------- | ----------- |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

## Rate Limiting

API requests are limited to 100 requests per minute per user. Exceeding this limit will result in a 429 Too Many Requests response. 