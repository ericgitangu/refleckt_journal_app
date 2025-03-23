'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { promptsApi, Prompt } from '@/lib/api';
import { DailyPrompt } from '@/components/DailyPrompt';
import { RandomPrompt } from '@/components/RandomPrompt';
import { PromptCard } from '@/components/PromptCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Calendar, 
  Edit, 
  FileText, 
  Search, 
  Sparkles, 
  Lightbulb, 
  ListFilter, 
  Loader2 
} from 'lucide-react';

const PROMPT_CATEGORIES = [
  'Gratitude',
  'Reflection',
  'Goals',
  'Creativity',
  'Growth',
  'Relationships',
  'Wellness',
  'Career',
  'Mindfulness',
  'All'
];

export default function PromptsPage() {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  // Fetch prompts based on active category
  const fetchPrompts = async () => {
    setIsLoading(true);
    try {
      let response;
      if (activeCategory === 'All') {
        response = await promptsApi.getAll();
        setPrompts(response.prompts);
      } else {
        response = await promptsApi.getByCategory(activeCategory);
        setPrompts(response.prompts);
      }
    } catch (error) {
      console.error('Error fetching prompts:', error);
      setPrompts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch prompts when the active category changes
  useEffect(() => {
    fetchPrompts();
  }, [activeCategory]);

  // Handle using a prompt
  const handleUsePrompt = (prompt: Prompt) => {
    router.push(`/journal/new?prompt=${encodeURIComponent(prompt.text)}`);
  };

  // Filter prompts based on search query
  const filteredPrompts = prompts.filter(prompt => {
    if (!searchQuery.trim()) return true;
    return prompt.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (prompt.tags && prompt.tags.some(tag => 
             tag.toLowerCase().includes(searchQuery.toLowerCase())
           ));
  });

  return (
    <div className="container max-w-7xl py-8">
      <div className="flex flex-col md:flex-row items-start gap-8">
        {/* Left side - Featured prompts */}
        <div className="w-full md:w-1/3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Prompt
              </CardTitle>
              <CardDescription>
                A new prompt selected for you each day
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DailyPrompt onUsePrompt={handleUsePrompt} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Random Inspiration
              </CardTitle>
              <CardDescription>
                Need some inspiration? Try a random prompt
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RandomPrompt onUsePrompt={handleUsePrompt} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Start Writing
              </CardTitle>
              <CardDescription>
                Begin a new journal entry
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Start a blank entry or use one of our prompts to inspire your writing.
              </p>
              <Button 
                className="w-full flex gap-2 items-center" 
                onClick={() => router.push('/journal/new')}
              >
                <FileText className="h-4 w-4" />
                New Entry
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right side - Browse prompts */}
        <div className="w-full md:w-2/3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Browse Prompts
              </CardTitle>
              <CardDescription>
                Explore our collection of journaling prompts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Search and filter bar */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-grow">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search prompts..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <ListFilter className="h-4 w-4 text-muted-foreground" />
                  <select
                    className="border rounded p-2 bg-background text-sm"
                    value={activeCategory}
                    onChange={(e) => setActiveCategory(e.target.value)}
                  >
                    {PROMPT_CATEGORIES.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Prompts grid */}
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredPrompts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No prompts found.</p>
                  {searchQuery && (
                    <Button 
                      variant="ghost" 
                      className="mt-2"
                      onClick={() => setSearchQuery('')}
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPrompts.map((prompt) => (
                    <PromptCard
                      key={prompt.id}
                      prompt={prompt}
                      onUsePrompt={handleUsePrompt}
                      compact
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 