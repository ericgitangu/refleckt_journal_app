"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { trpc } from "@/app/hooks/useTRPC";
import { JournalEntryFeed } from "@/components/journal/journal-entry-feed";
import { TrpcExample } from "@/components/TrpcExample";

export default function JournalPage() {
  const { data: session, status } = useSession();
  // Example of using tRPC to fetch data
  const { data: journalData, isLoading: isLoadingJournal } =
    trpc.getJournalEntries.useQuery();

  if (status === "loading" || isLoadingJournal) {
    return (
      <div className="container flex h-screen w-screen flex-col items-center justify-center">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Journal</h1>
        <Button>
          <Icons.plus className="mr-2 h-4 w-4" />
          New Entry
        </Button>
      </div>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Journal Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Using our TrpcExample component to demonstrate tRPC usage */}
            <TrpcExample />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
