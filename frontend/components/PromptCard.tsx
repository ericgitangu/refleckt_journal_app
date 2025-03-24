"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Edit3 } from "lucide-react";
import type { Prompt } from "@/lib/api";

interface PromptCardProps {
  prompt: Prompt;
  onUsePrompt?: (prompt: Prompt) => void;
  compact?: boolean;
}

export function PromptCard({
  prompt,
  onUsePrompt,
  compact = false,
}: PromptCardProps) {
  const router = useRouter();

  const handleUsePrompt = () => {
    if (onUsePrompt) {
      onUsePrompt(prompt);
    } else {
      // Default action: navigate to new entry with prompt
      router.push(`/journal/new?prompt=${encodeURIComponent(prompt.text)}`);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className={compact ? "pb-2" : undefined}>
        <div className="flex justify-between items-start">
          <CardTitle
            className={`${compact ? "text-base" : "text-xl"} font-serif`}
          >
            Daily Reflection
          </CardTitle>
          <Badge variant="outline" className="bg-muted/50">
            {prompt.category}
          </Badge>
        </div>
        {!compact && (
          <CardDescription>
            {new Date(prompt.created_at).toLocaleDateString()}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-grow">
        <p
          className={`${compact ? "text-sm" : "text-base"} italic text-muted-foreground font-medium leading-relaxed`}
        >
          &ldquo;{prompt.text}&rdquo;
        </p>
        {!compact && prompt.tags && prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-4">
            {prompt.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className={`${compact ? "pt-2" : "pt-4"} flex justify-end`}>
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          className="flex gap-2 items-center"
          onClick={handleUsePrompt}
        >
          <Edit3 className="h-4 w-4" />
          Use Prompt
        </Button>
      </CardFooter>
    </Card>
  );
}
