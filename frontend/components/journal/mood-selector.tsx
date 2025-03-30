import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MoodSelectorProps {
  value: string | undefined;
  onChange: (value: string) => void;
}

const moods = [
  { value: 'happy', label: '😊 Happy' },
  { value: 'content', label: '🙂 Content' },
  { value: 'grateful', label: '🙏 Grateful' },
  { value: 'excited', label: '😃 Excited' },
  { value: 'hopeful', label: '🌱 Hopeful' },
  { value: 'anxious', label: '😰 Anxious' },
  { value: 'stressed', label: '😫 Stressed' },
  { value: 'sad', label: '😢 Sad' },
  { value: 'frustrated', label: '😤 Frustrated' },
  { value: 'reflective', label: '🤔 Reflective' },
  { value: 'peaceful', label: '😌 Peaceful' },
  { value: 'tired', label: '😴 Tired' },
  { value: 'energized', label: '⚡ Energized' },
  { value: 'inspired', label: '✨ Inspired' },
  { value: 'proud', label: '🦋 Proud' },
  { value: 'neutral', label: '😐 Neutral' },
];

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