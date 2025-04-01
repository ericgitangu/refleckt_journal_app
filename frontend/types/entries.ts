export interface Entry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  mood?: string;
  location?: string;
  word_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateEntryRequest {
  title: string;
  content: string;
  tags?: string[];
  mood?: string;
  location?: string;
}

export interface UpdateEntryRequest {
  title?: string;
  content?: string;
  tags?: string[];
  mood?: string;
  location?: string;
}

export interface SearchEntryParams {
  text?: string;
  tags?: string | string[];
  from_date?: string;
  to_date?: string;
  mood?: string;
  sort_by?: "date_asc" | "date_desc" | "title_asc" | "title_desc";
  limit?: number;
  page?: number;
}

export interface TagCount {
  tag: string;
  count: number;
}
