import React, { useState } from 'react';
import { aiApi } from '@/lib/api';
import { ErrorBoundary } from './ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PromptGeneratorProps {
  onSelectPrompt?: (promptText: string) => void;
  defaultCategory?: string;
}

const CATEGORIES = [
  'gratitude',
  'reflection',
  'goals',
  'creativity',
  'personal-growth',
  'relationships',
  'challenge',
  'mindfulness',
  'other'
];

function PromptGeneratorContent({ onSelectPrompt, defaultCategory = 'reflection' }: PromptGeneratorProps) {
  const [category, setCategory] = useState(defaultCategory);
  const [authorStyle, setAuthorStyle] = useState('');
  const [useHistory, setUseHistory] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPrompts, setGeneratedPrompts] = useState<Array<{ text: string, category: string }>>([]);

  const handleGeneratePrompt = async () => {
    try {
      setLoading(true);
      setError(null);

      const options = {
        category,
        authorStyle: authorStyle || undefined,
        basedOn: useHistory ? undefined : [],
      };

      // Generate 3 prompts at once
      const response = await aiApi.generatePromptBatch({
        ...options,
        count: 3
      });

      if (response && response.length) {
        setGeneratedPrompts(response.map(p => ({
          text: p.text,
          category: p.category
        })));
      } else {
        setError('No prompts were generated');
      }
    } catch (err) {
      console.error('Error generating prompts:', err);
      setError('Failed to generate prompts. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPrompt = (promptText: string) => {
    if (onSelectPrompt) {
      onSelectPrompt(promptText);
    }
  };

  return (
    <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-white">
      <h3 className="text-lg font-medium">AI Prompt Generator</h3>
      
      <div className="space-y-3">
        <div>
          <Label htmlFor="category">Prompt Category</Label>
          <Select 
            value={category} 
            onValueChange={(value) => setCategory(value)}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="style">Writing Style (Optional)</Label>
          <Input 
            id="style" 
            placeholder="e.g., 'like Marcus Aurelius' or 'poetic'"
            value={authorStyle}
            onChange={(e) => setAuthorStyle(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Describe a writing style or author to emulate
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="use-history" 
            checked={useHistory} 
            onCheckedChange={(checked) => setUseHistory(checked as boolean)}
          />
          <Label htmlFor="use-history" className="cursor-pointer">
            Based on your journal history
          </Label>
        </div>
        
        <Button 
          onClick={handleGeneratePrompt} 
          disabled={loading || !category}
          className="w-full"
        >
          {loading ? <Spinner className="mr-2" /> : null}
          Generate Prompts
        </Button>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {generatedPrompts.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Generated Prompts:</h4>
          <div className="space-y-2">
            {generatedPrompts.map((prompt, index) => (
              <div 
                key={index}
                className="p-3 border border-blue-100 rounded-md bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={() => handleSelectPrompt(prompt.text)}
              >
                <p className="text-sm text-blue-800">{prompt.text}</p>
                <span className="text-xs text-blue-600 mt-1 inline-block">
                  {prompt.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function PromptGenerator(props: PromptGeneratorProps) {
  return (
    <ErrorBoundary>
      <PromptGeneratorContent {...props} />
    </ErrorBoundary>
  );
} 