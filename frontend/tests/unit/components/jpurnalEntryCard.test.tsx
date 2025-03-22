import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { JournalEntryCard } from '@/components/journal/journal-entry-card';

const mockEntry = {
  id: 'entry-123',
  title: 'Test Journal Entry',
  content: 'This is a test journal entry content',
  created_at: '2023-04-12T10:30:00Z',
  updated_at: '2023-04-12T10:30:00Z',
  tags: ['test', 'journal']
};

const mockDeleteEntry = jest.fn();

describe('JournalEntryCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders entry details correctly', () => {
    render(<JournalEntryCard entry={mockEntry} onDelete={mockDeleteEntry} />);
    
    // @ts-ignore -- jest-dom adds custom matchers
    expect(screen.getByText('Test Journal Entry')).toBeInTheDocument();
    // @ts-ignore -- jest-dom adds custom matchers
    expect(screen.getByText(/This is a test journal entry/)).toBeInTheDocument();
    // @ts-ignore -- jest-dom adds custom matchers
    expect(screen.getByText('test')).toBeInTheDocument();
    // @ts-ignore -- jest-dom adds custom matchers
    expect(screen.getByText('journal')).toBeInTheDocument();
  });

  it('calls delete function when delete button is clicked', () => {
    render(<JournalEntryCard entry={mockEntry} onDelete={mockDeleteEntry} />);
    
    fireEvent.click(screen.getByLabelText('Delete entry'));
    // @ts-ignore -- jest matchers
    expect(mockDeleteEntry).toHaveBeenCalledWith('entry-123');
  });
});