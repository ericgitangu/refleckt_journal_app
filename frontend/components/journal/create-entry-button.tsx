"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Lightbulb, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useJournalEntries } from "@/hooks/use-journal-entries";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(3, "Content is too short"),
  tags: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateEntryButton() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { createEntry } = useJournalEntries();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      tags: "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      setIsLoading(true);
      const tags = values.tags
        ? values.tags.split(",").map((tag) => tag.trim())
        : [];

      const newEntry = await createEntry({
        title: values.title,
        content: values.content,
        tags,
      });

      setIsOpen(false);
      form.reset();
      router.push(`/journal/${newEntry.id}`);
    } catch (error) {
      console.error("Failed to create entry:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const navigateToNewEntry = () => {
    router.push("/journal/new");
  };

  const navigateToPrompts = () => {
    router.push("/journal/prompts");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> New Entry
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={navigateToNewEntry}
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          <span>Blank Entry</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={navigateToPrompts}
          className="flex items-center gap-2"
        >
          <Lightbulb className="h-4 w-4" />
          <span>Use a Prompt</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DialogTrigger asChild>
          <DropdownMenuItem
            onSelect={(e) => e.preventDefault()}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Quick Entry</span>
          </DropdownMenuItem>
        </DialogTrigger>
      </DropdownMenuContent>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Journal Entry</DialogTitle>
            <DialogDescription>
              Capture your thoughts, feelings, and experiences.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Give your entry a title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Write your thoughts here..."
                        className="min-h-[200px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags (comma separated)</FormLabel>
                    <FormControl>
                      <Input placeholder="work, personal, ideas" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Entry
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DropdownMenu>
  );
}
