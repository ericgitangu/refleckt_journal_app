import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MOOD_EMOJIS } from '@/lib/mood-utils';

interface MoodSelectorProps {
  value: string | undefined;
  onChange: (value: string) => void;
}

// Create mood options using the shared MOOD_EMOJIS definitions
const moods = Object.entries(MOOD_EMOJIS).map(([value, emoji]) => ({
  value,
  label: `${emoji} ${value.charAt(0).toUpperCase() + value.slice(1)}`
}));

// Sort moods alphabetically
moods.sort((a, b) => a.value.localeCompare(b.value));

export default function MoodSelector({ value, onChange }: MoodSelectorProps) {
  return (
    <div className="flex flex-col">
      <label htmlFor="mood-select" className="text-sm text-muted-foreground mb-1">
        Mood
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[140px]" id="mood-select">
          <SelectValue placeholder="Select mood" />
        </SelectTrigger>
        <SelectContent>
          {moods.map((mood) => (
            <SelectItem key={mood.value} value={mood.value}>
              {mood.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 