export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface EntryType {
  id: string;
  title: string;
  content: string;
  date: string;
  mood?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  categories: Category[];
}

// Alias for backward compatibility with existing code
export type JournalEntry = EntryType;
