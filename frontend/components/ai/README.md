# AI Components for Reflekt Journal

This directory contains React components for AI-powered features in the Reflekt Journal application.

## Available Components

### EntryInsights

Displays AI-generated insights for a journal entry, including sentiment analysis, keywords, topic suggestions, and reflective questions.

```tsx
import { EntryInsights } from '../components/ai';

function JournalEntryPage({ entryId }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2">
        {/* Entry content */}
      </div>
      <div className="col-span-1">
        <EntryInsights entryId={entryId} />
      </div>
    </div>
  );
}
```

### PromptGenerator

Generates AI-powered writing prompts based on category, themes, and mood. Allows users to select prompts for their journal entries.

```tsx
import { PromptGenerator } from '../components/ai';

function NewEntryPage() {
  const handleSelectPrompt = (prompt) => {
    // Add prompt to the entry content
    setEntryContent(`Prompt: ${prompt.text}\n\n`);
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2">
        {/* Entry editor */}
      </div>
      <div className="col-span-1">
        <PromptGenerator onSelectPrompt={handleSelectPrompt} />
      </div>
    </div>
  );
}
```

## Integration with Backend

These components interact with the backend AI services through the API client in `src/services/api.ts`. The backend uses one of the following AI providers:

- OpenAI GPT models
- Anthropic Claude models
- RustBert (for local development)

## Configuration

The AI provider is configured in the backend using environment variables. No additional frontend configuration is needed beyond setting the API URL:

```
NEXT_PUBLIC_API_URL=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/dev
```

## Usage Notes

1. AI insights might take a few moments to generate after an entry is created or updated
2. The EntryInsights component will display loading and error states appropriately
3. Generated prompts are stored in the database and can be retrieved later 