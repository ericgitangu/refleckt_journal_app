# Reflekt Journal API Documentation

This document provides detailed information about the APIs exposed by the Reflekt Journal backend services.

## Table of Contents

- [Authentication](#authentication)
- [Entry Service](#entry-service)
- [Analytics Service](#analytics-service)
- [Settings Service](#settings-service)
- [AI Service](#ai-service)

## Authentication

All API requests (except for login/register) require authentication using JWT tokens.

### Base URL

```
https://api.reflekt-journal.app/auth
```

### Endpoints

#### Login

```
POST /login
```

Request:
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### Register

```
POST /register
```

Request:
```json
{
  "email": "newuser@example.com",
  "password": "securepassword",
  "name": "Jane Doe"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-456",
    "email": "newuser@example.com",
    "name": "Jane Doe"
  }
}
```

#### Refresh Token

```
POST /refresh
```

Request:
```json
{
  "refreshToken": "refresh-token-value"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Entry Service

The Entry Service handles journal entries management.

### Base URL

```
https://api.reflekt-journal.app/entries
```

### Endpoints

#### Get All Entries

```
GET /
```

Query Parameters:
- `limit` (optional): Number of entries to return (default: 20)
- `offset` (optional): Pagination offset (default: 0)
- `sort` (optional): Sort order (`created_at`, `updated_at`, `title`)
- `order` (optional): Sort direction (`asc`, `desc`)

Response:
```json
{
  "entries": [
    {
      "id": "entry-123",
      "title": "My First Journal Entry",
      "content": "Today was a great day...",
      "created_at": "2023-03-15T12:00:00Z",
      "updated_at": "2023-03-15T12:00:00Z",
      "tags": ["personal", "reflection"]
    },
    ...
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

#### Get Entry by ID

```
GET /:id
```

Response:
```json
{
  "id": "entry-123",
  "title": "My First Journal Entry",
  "content": "Today was a great day...",
  "created_at": "2023-03-15T12:00:00Z",
  "updated_at": "2023-03-15T12:00:00Z",
  "tags": ["personal", "reflection"],
  "mood": "happy"
}
```

#### Create Entry

```
POST /
```

Request:
```json
{
  "title": "New Journal Entry",
  "content": "Today I learned about microservices...",
  "tags": ["learning", "technology"]
}
```

Response:
```json
{
  "id": "entry-789",
  "title": "New Journal Entry",
  "content": "Today I learned about microservices...",
  "created_at": "2023-03-16T14:30:00Z",
  "updated_at": "2023-03-16T14:30:00Z",
  "tags": ["learning", "technology"]
}
```

#### Update Entry

```
PUT /:id
```

Request:
```json
{
  "title": "Updated Journal Entry",
  "content": "With additional content...",
  "tags": ["learning", "technology", "updated"]
}
```

Response:
```json
{
  "id": "entry-789",
  "title": "Updated Journal Entry",
  "content": "With additional content...",
  "created_at": "2023-03-16T14:30:00Z",
  "updated_at": "2023-03-16T15:45:00Z",
  "tags": ["learning", "technology", "updated"]
}
```

#### Delete Entry

```
DELETE /:id
```

Response:
```json
{
  "message": "Entry deleted successfully"
}
```

#### Search Entries

```
GET /search
```

Query Parameters:
- `q`: Search query
- `tags` (optional): Filter by tags

Response:
```json
{
  "entries": [
    {
      "id": "entry-123",
      "title": "My First Journal Entry",
      "content": "Today was a great day...",
      "created_at": "2023-03-15T12:00:00Z",
      "updated_at": "2023-03-15T12:00:00Z",
      "tags": ["personal", "reflection"],
      "relevance": 0.95
    },
    ...
  ],
  "total": 3
}
```

## Analytics Service

The Analytics Service provides insights and statistics about journal entries.

### Base URL

```
https://api.reflekt-journal.app/analytics
```

### Endpoints

#### Get Mood Analysis

```
GET /mood
```

Query Parameters:
- `period` (optional): Time period (`week`, `month`, `year`, default: `month`)

Response:
```json
{
  "period": "month",
  "moods": [
    {
      "date": "2023-03-01",
      "mood": "happy",
      "score": 0.8
    },
    {
      "date": "2023-03-02",
      "mood": "neutral",
      "score": 0.5
    },
    ...
  ],
  "average": 0.65,
  "dominant_mood": "happy"
}
```

#### Get Entry Frequency

```
GET /frequency
```

Query Parameters:
- `period` (optional): Time period (`week`, `month`, `year`, default: `month`)

Response:
```json
{
  "period": "month",
  "days": [
    {
      "date": "2023-03-01",
      "count": 2
    },
    {
      "date": "2023-03-02",
      "count": 1
    },
    ...
  ],
  "total": 25,
  "average_per_day": 0.8
}
```

#### Get Topic Analysis

```
GET /topics
```

Response:
```json
{
  "topics": [
    {
      "name": "work",
      "count": 12,
      "percentage": 25.5
    },
    {
      "name": "personal",
      "count": 8,
      "percentage": 17.0
    },
    ...
  ],
  "total_entries": 47
}
```

## Settings Service

The Settings Service manages user preferences and application settings.

### Base URL

```
https://api.reflekt-journal.app/settings
```

### Endpoints

#### Get User Profile

```
GET /profile
```

Response:
```json
{
  "id": "user-123",
  "email": "user@example.com",
  "name": "John Doe",
  "preferences": {
    "theme": "dark",
    "reminderTime": "20:00",
    "weeklyDigest": true
  }
}
```

#### Update User Profile

```
PUT /profile
```

Request:
```json
{
  "name": "John Smith",
  "preferences": {
    "theme": "light",
    "reminderTime": "21:00"
  }
}
```

Response:
```json
{
  "id": "user-123",
  "email": "user@example.com",
  "name": "John Smith",
  "preferences": {
    "theme": "light",
    "reminderTime": "21:00",
    "weeklyDigest": true
  }
}
```

#### Get Categories

```
GET /categories
```

Response:
```json
{
  "categories": [
    {
      "id": "cat-1",
      "name": "Personal",
      "color": "#3498db"
    },
    {
      "id": "cat-2",
      "name": "Work",
      "color": "#2ecc71"
    },
    ...
  ]
}
```

#### Create Category

```
POST /categories
```

Request:
```json
{
  "name": "Health",
  "color": "#e74c3c"
}
```

Response:
```json
{
  "id": "cat-3",
  "name": "Health",
  "color": "#e74c3c"
}
```

## AI Service

The AI Service provides AI-powered features for journal entries.

### Base URL

```
https://api.reflekt-journal.app/ai
```

### Endpoints

#### Get Sentiment Analysis

```
POST /sentiment
```

Request:
```json
{
  "text": "Today was a wonderful day. I accomplished a lot and felt really productive."
}
```

Response:
```json
{
  "sentiment": "positive",
  "score": 0.87,
  "emotions": {
    "joy": 0.75,
    "satisfaction": 0.65,
    "pride": 0.55
  }
}
```

#### Get Content Suggestions

```
POST /suggestions
```

Request:
```json
{
  "entry_id": "entry-123",
  "prompt": "reflection"
}
```

Response:
```json
{
  "suggestions": [
    "How did this experience change your perspective?",
    "What did you learn from this situation?",
    "If you could do it again, what would you do differently?"
  ]
}
```

#### Generate Summary

```
POST /summarize
```

Request:
```json
{
  "entries": ["entry-123", "entry-456", "entry-789"],
  "period": "week"
}
```

Response:
```json
{
  "summary": "This week you focused primarily on work projects and personal development. You had several productive days, particularly Wednesday when you completed the database migration. Your mood was generally positive with some stress mid-week related to project deadlines. You mentioned exercise 3 times and completed your goal of working out 4 times this week.",
  "highlights": [
    "Completed database migration",
    "Workout goal achieved",
    "Started reading new book"
  ],
  "mood_summary": "Mostly positive with brief periods of stress"
}
```

## Error Responses

All API endpoints return standard HTTP status codes and structured error responses:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource was not found",
    "details": {
      "resource_id": "entry-999"
    }
  }
}
```

Common error codes:
- `UNAUTHORIZED`: Authentication failed or token expired
- `FORBIDDEN`: Permission denied
- `RESOURCE_NOT_FOUND`: Requested resource does not exist
- `VALIDATION_ERROR`: Request validation failed
- `INTERNAL_ERROR`: Internal server error 