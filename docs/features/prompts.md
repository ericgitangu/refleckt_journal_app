# Daily Prompts Feature Documentation

The Daily Prompts feature provides users with thoughtful journaling prompts to inspire reflection and enhance their journaling experience in the Reflekt Journal application.

## Overview

Writer's block can be a common challenge in journaling. The Daily Prompts feature provides a curated selection of writing prompts that can help users start writing when they're not sure what to write about or want to explore new themes in their journaling practice.

## Key Components

### Backend

1. **Prompts Service**: A dedicated serverless Lambda function that manages journal prompts.
   - Located in: `backend/prompts-service/`
   - Provides API endpoints for fetching, creating, updating, and deleting prompts

2. **Prompts DynamoDB Table**: Stores prompt data.
   - Table name: `reflekt-prompts-${Stage}`
   - Primary key: `id` (string)
   - Has a Global Secondary Index on `category` for quick categorized lookups

3. **API Endpoints**:
   - `GET /prompts` - List all prompts
   - `GET /prompts/daily` - Get a prompt for today
   - `GET /prompts/random` - Get a random prompt
   - `GET /prompts/category/{category}` - Get prompts filtered by category
   - `GET /prompts/{id}` - Get a specific prompt
   - `POST /prompts` - Create a new prompt (admin only)
   - `PUT /prompts/{id}` - Update a prompt (admin only)
   - `DELETE /prompts/{id}` - Delete a prompt (admin only)

### Frontend

1. **API Client**:
   - Located in: `frontend/lib/api.ts`
   - Provides TypeScript methods for interacting with the prompts API

2. **Components**:
   - `PromptCard`: Displays a single prompt with options to use it
   - `DailyPrompt`: Fetches and displays the daily prompt
   - `RandomPrompt`: Fetches and displays a random prompt

3. **Pages**:
   - `/journal/prompts`: Browse and discover journaling prompts
   - `/journal/new`: Create new entries with optional prompt integration

## Usage

### For Users

1. **View Daily Prompt**:
   - Navigate to the Prompts page (`/journal/prompts`)
   - The daily prompt appears in the "Today's Prompt" section
   - Click "Use Prompt" to start a new journal entry with this prompt

2. **Discover Random Prompts**:
   - Navigate to the Prompts page
   - In the "Random Inspiration" section, click "Get Inspired" or refresh
   - Click "Use Prompt" to start writing with the displayed prompt

3. **Browse Prompts by Category**:
   - Navigate to the Prompts page
   - Use the dropdown filter to select a category
   - Browse prompts in the selected category

4. **Search Prompts**:
   - Navigate to the Prompts page
   - Use the search bar to find prompts by keyword

5. **Use a Prompt While Writing**:
   - When creating a new entry, click "Show Prompts"
   - Select a prompt to incorporate into your writing

### For Administrators

1. **Creating Prompts**:
   - Use the API endpoint `POST /prompts` with appropriate authentication
   - Required fields: `text` (the prompt text) and `category`
   - Optional: `tags` array for additional categorization

2. **Managing Prompts**:
   - Update prompts using `PUT /prompts/{id}`
   - Delete prompts using `DELETE /prompts/{id}`

## Implementation Details

### Prompt Selection Algorithm

- **Daily Prompt**: Uses the current date as a seed to deterministically select a prompt, ensuring all users see the same prompt on a given day
- **Random Prompt**: Randomly selects a prompt from the available pool, refreshed on demand

### Categories

The system includes several predefined categories:
- Gratitude
- Reflection
- Goals
- Creativity
- Growth
- Relationships
- Wellness
- Career
- Mindfulness

### Example Prompts

1. **Gratitude**: "List five things you're grateful for today that you normally take for granted."
2. **Reflection**: "What was the most challenging part of your day, and what did you learn from it?"
3. **Goals**: "Describe one step you can take today toward a long-term goal."
4. **Creativity**: "If you could create a new holiday, what would it celebrate and how would people observe it?"

## Technical Considerations

1. **Performance**: Prompts are cached appropriately to minimize database reads
2. **Security**: Only authenticated users can view prompts; only admins can modify them
3. **Offline Support**: Daily prompts can be cached locally for offline access
4. **Extensibility**: The category system allows for easy expansion of prompt types 