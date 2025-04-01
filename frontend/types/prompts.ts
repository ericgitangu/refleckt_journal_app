export interface Prompt {
  id: string;
  text: string;
  category: string;
  tags: string[];
  difficulty: string;
  mood_appropriate?: string[];
  created_at: string;
  updated_at: string;
}

export interface PromptCategory {
  id: string;
  name: string;
  description: string;
  count: number;
}

export interface PromptHistory {
  recently_shown: string[];
  last_shown_date: string;
  favorite_categories: string[];
}
