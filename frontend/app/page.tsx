import { ThemeToggleClient } from '@/components/theme/theme-toggle-client';
import { BookOpen, PenLine, Archive, Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-[90vh] flex flex-col items-center justify-center">
      <div className="absolute top-4 right-4">
        <ThemeToggleClient />
      </div>
      
      <div className="max-w-3xl w-full px-4">
        <div className="journal-paper p-8 rounded-lg">
          <div className="text-center mb-10">
            <h1 className="text-5xl font-serif font-bold mb-3">Reflekt</h1>
            <p className="text-lg text-muted-foreground">Your personal journaling space with AI-powered insights</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <FeatureCard 
              icon={<PenLine className="h-6 w-6" />}
              title="Write & Reflect"
              description="Capture your thoughts, feelings, and experiences in a beautiful, distraction-free environment"
            />
            <FeatureCard 
              icon={<Archive className="h-6 w-6" />}
              title="Organize Easily"
              description="Categorize entries with tags and search through your journal to find past reflections"
            />
            <FeatureCard 
              icon={<BookOpen className="h-6 w-6" />}
              title="Daily Prompts"
              description="Never run out of ideas with our thoughtful journaling prompts to inspire reflection"
            />
            <FeatureCard 
              icon={<Sparkles className="h-6 w-6" />}
              title="AI Insights"
              description="Discover patterns and gain deeper understanding of your thoughts with AI-powered analysis"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/journal"
              className="px-6 py-3 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-md hover:bg-[hsl(var(--primary))]/90 transition text-center font-medium"
            >
              View Journal
            </a>
            <a 
              href="/journal/new"
              className="px-6 py-3 bg-[hsl(var(--journal-accent))] text-[hsl(var(--journal-ink))] rounded-md hover:bg-[hsl(var(--journal-accent))]/80 transition text-center font-medium"
            >
              New Entry
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex gap-4 p-4 rounded-md bg-[hsl(var(--background))]/50 hover:bg-[hsl(var(--background))]/80 transition">
      <div className="shrink-0 h-12 w-12 rounded-full bg-[hsl(var(--primary))]/10 flex items-center justify-center text-[hsl(var(--primary))]">
        {icon}
      </div>
      <div>
        <h3 className="font-medium text-lg mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
