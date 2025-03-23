'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export default function ThemeToggleClient() {
  // Track mounting state to avoid rendering during SSR
  const [mounted, setMounted] = useState(false);
  const { setTheme, theme } = useTheme();

  // Only render after component mounts to avoid hydration mismatch
  useEffect(() => setMounted(true), []);
  
  if (!mounted) {
    // Render empty button during SSR/before hydration
    return <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
      <span className="sr-only">Toggle theme</span>
    </Button>;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      aria-label="Toggle theme"
      className="rounded-full h-9 w-9"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
} 