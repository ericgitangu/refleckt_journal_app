'use client';

import { useState, useEffect } from 'react';
import { entriesApi } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  category_id?: string;
  created_at: string;
  updated_at: string;
  mood?: string;
  tags?: string[];
}

export function useJournalEntries() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEntries() {
      try {
        setIsLoading(true);
        const data = await entriesApi.getAll();
        setEntries(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch journal entries:', err);
        setError('Failed to load journal entries. Please try again later.');
        toast({
          title: 'Error',
          description: 'Failed to load journal entries',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchEntries();
  }, []);

  const createEntry = async (entryData: Omit<JournalEntry, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setIsLoading(true);
      // Convert mood from string to number if it exists
      const processedData = {
        ...entryData,
        mood: entryData.mood ? Number(entryData.mood) : undefined
      };
      const newEntry = await entriesApi.create(processedData);
      setEntries(prev => [newEntry, ...prev]);
      toast({
        title: 'Success',
        description: 'Journal entry created',
      });
      return newEntry;
    } catch (err) {
      console.error('Failed to create journal entry:', err);
      toast({
        title: 'Error',
        description: 'Failed to create journal entry',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateEntry = async (id: string, entryData: Partial<JournalEntry>) => {
    try {
      setIsLoading(true);
      // Convert mood from string to number if it exists
      const processedData = {
        ...entryData,
        mood: entryData.mood !== undefined ? Number(entryData.mood) : undefined
      };
      const updatedEntry = await entriesApi.update(id, processedData);
      setEntries(prev => 
        prev.map(entry => entry.id === id ? updatedEntry : entry)
      );
      toast({
        title: 'Success',
        description: 'Journal entry updated',
      });
      return updatedEntry;
    } catch (err) {
      console.error('Failed to update journal entry:', err);
      toast({
        title: 'Error',
        description: 'Failed to update journal entry',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      setIsLoading(true);
      await entriesApi.delete(id);
      setEntries(prev => prev.filter(entry => entry.id !== id));
      toast({
        title: 'Success',
        description: 'Journal entry deleted',
      });
    } catch (err) {
      console.error('Failed to delete journal entry:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete journal entry',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const searchEntries = async (query: string) => {
    try {
      setIsLoading(true);
      const results = await entriesApi.search(query);
      return results;
    } catch (err) {
      console.error('Failed to search journal entries:', err);
      toast({
        title: 'Error',
        description: 'Failed to search journal entries',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    entries,
    isLoading,
    error,
    createEntry,
    updateEntry,
    deleteEntry,
    searchEntries
  };
} 