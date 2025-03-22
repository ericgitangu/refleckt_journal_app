import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { CreateEntryButton } from '@/components/journal/create-entry-button';
import { JournalEntryFeed } from '@/components/journal/journal-entry-feed';
import { ThemeToggleClient } from '@/components/theme/theme-toggle-client';
import { Providers } from '@/app/providers/Providers';

// Mock server to intercept API requests
const server = setupServer(
  http.get('/api/entries', () => {
    return Response.json([
      { id: '1', title: 'Existing Entry', content: 'This is an existing entry', created_at: '2023-01-01T12:00:00Z', updated_at: '2023-01-01T12:00:00Z', tags: ['test'] }
    ]);
  }),
  
  http.post('/api/entries', async ({ request }) => {
    const body = await request.json() as Record<string, any>;
    return Response.json({
      id: '2',
      ...body,
      created_at: '2023-01-02T12:00:00Z',
      updated_at: '2023-01-02T12:00:00Z'
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Journal Entry Flow', () => {
  it('allows creating and viewing a journal entry', async () => {
    render(
      <Providers>
        <div>
          <div className="flex items-center gap-4">
            <CreateEntryButton />
            <ThemeToggleClient />
          </div>
          <JournalEntryFeed />
        </div>
      </Providers>
    );
    
    // Existing entry should be visible
    await waitFor(() => {
      // @ts-ignore -- jest-dom adds custom matchers
      expect(screen.getByText('Existing Entry')).toBeInTheDocument();
    });
    
    // Click to create a new entry
    fireEvent.click(screen.getByText(/New Entry/i));
    
    // Fill in the form
    userEvent.type(screen.getByLabelText(/Title/i), 'My Integration Test Entry');
    userEvent.type(screen.getByLabelText(/Content/i), 'This entry was created during an integration test');
    userEvent.type(screen.getByLabelText(/Tags/i), 'test,integration');
    
    // Submit the form
    fireEvent.click(screen.getByText(/Create Entry/i));
    
    // New entry should appear in the feed
    await waitFor(() => {
      // @ts-ignore -- jest-dom adds custom matchers
      expect(screen.getByText('My Integration Test Entry')).toBeInTheDocument();
      // @ts-ignore -- jest-dom adds custom matchers
      expect(screen.getByText('This entry was created during an integration test')).toBeInTheDocument();
      // @ts-ignore -- jest-dom adds custom matchers
      expect(screen.getByText('test')).toBeInTheDocument();
      // @ts-ignore -- jest-dom adds custom matchers
      expect(screen.getByText('integration')).toBeInTheDocument();
    });
  });
});