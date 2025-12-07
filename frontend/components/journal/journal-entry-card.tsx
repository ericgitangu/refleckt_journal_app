// File: components/journal/journal-entry-card.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit, MoreVertical, Trash, Share, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { JournalEntry } from "@/hooks/use-journal-entries";

interface JournalEntryCardProps {
  entry: JournalEntry;
  onEdit?: (id: string) => void;
  onDelete: (id: string) => void;
}

export function JournalEntryCard({
  entry,
  onEdit,
  onDelete,
}: JournalEntryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();

  const handleViewEntry = () => {
    router.push(`/journal/${entry.id}`);
  };

  const truncatedContent =
    entry.content.length > 200 && !isExpanded
      ? `${entry.content.substring(0, 200)}...`
      : entry.content;

  const timeAgo = formatDistanceToNow(new Date(entry.created_at), {
    addSuffix: true,
  });

  return (
    <Card className="mb-4 transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle
            className="text-xl cursor-pointer hover:text-primary transition-colors"
            onClick={handleViewEntry}
          >
            {entry.title}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={handleViewEntry}>
                <Eye className="mr-2 h-4 w-4" />
                <span>View</span>
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(entry.id)}>
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Edit</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <Share className="mr-2 h-4 w-4" />
                <span>Share</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(entry.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription>{timeAgo}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground whitespace-pre-line">
          {truncatedContent}
        </p>
        {entry.content.length > 200 && (
          <Button
            variant="link"
            className="p-0 h-auto mt-2 text-muted-foreground"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Read less" : "Read more"}
          </Button>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 pt-0">
        {entry.tags &&
          entry.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        {entry.mood && <Badge variant="secondary">Mood: {entry.mood}</Badge>}
      </CardFooter>
    </Card>
  );
}
