import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MoodSelectorProps {
  value: string | undefined;
  onChange: (value: string) => void;
}

const moods = [
  { value: 'happy', label: '😊 Happy' },
  { value: 'sad', label: '😢 Sad' },
  { value: 'anxious', label: '😰 Anxious' },
  { value: 'calm', label: '😌 Calm' },
  { value: 'angry', label: '😡 Angry' },
  { value: 'excited', label: '😃 Excited' },
  { value: 'tired', label: '😴 Tired' },
  { value: 'neutral', label: '😐 Neutral' },
];

export default function MoodSelector({ value, onChange }: MoodSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[140px]">
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
  );
} 