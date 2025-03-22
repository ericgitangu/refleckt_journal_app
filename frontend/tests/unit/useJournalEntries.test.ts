import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useJournalEntries } from '@/hooks/use-journal-entries';
import { entriesApi } from '@/lib/api';

// Mock the API module
jest.mock('@/lib/api', () => ({
  entriesApi: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    search: jest.fn()
  }
}));

describe('useJournalEntries', () => {
  const mockEntries = [
    { id: '1', title: 'Entry 1', content: 'Content 1', created_at: '2023-01-01', updated_at: '2023-01-01' },
    { id: '2', title: 'Entry 2', content: 'Content 2', created_at: '2023-01-02', updated_at: '2023-01-02' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (entriesApi.getAll as jest.Mock).mockResolvedValue(mockEntries);
  });

  it('fetches entries on mount', async () => {
    const { result } = renderHook(() => useJournalEntries());
    
    // @ts-ignore -- jest matchers
    expect(result.current.isLoading).toBe(true);
    
    // Wait for the API call to resolve
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // @ts-ignore -- jest matchers
    expect(result.current.entries).toEqual(mockEntries);
    // @ts-ignore -- jest matchers
    expect(result.current.isLoading).toBe(false);
    // @ts-ignore -- jest matchers
    expect(entriesApi.getAll).toHaveBeenCalledTimes(1);
  });

  it('creates a new entry', async () => {
    const newEntry = { title: 'New Entry', content: 'New Content', tags: ['new'] };
    const createdEntry = { ...newEntry, id: '3', created_at: '2023-01-03', updated_at: '2023-01-03' };
    
    (entriesApi.create as jest.Mock).mockResolvedValue(createdEntry);
    
    const { result } = renderHook(() => useJournalEntries());
    
    // Wait for initial fetch to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Create new entry
    await act(async () => {
      result.current.createEntry(newEntry);
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // @ts-ignore -- jest matchers
    expect(entriesApi.create).toHaveBeenCalledWith(newEntry);
    // @ts-ignore -- jest matchers
    expect(result.current.entries[0]).toEqual(createdEntry); // Should be at the top of the list
  });
});