"use client";

import React, { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import { ClientOnly } from "@/components/ClientOnly";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSettings } from "@/context/SettingsContext";
import { toast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import {
  Sun,
  Moon,
  Monitor,
  Bell,
  BellOff,
  LayoutGrid,
  List,
  Calendar,
  Trash2,
  AlertTriangle,
  Save,
  RefreshCw,
  User,
  Palette,
  Settings2,
  Shield,
  Type,
  Clock,
} from "lucide-react";

// Deletion reasons for account deletion
const DELETION_REASONS = [
  { id: "not_useful", label: "The app isn't useful for me" },
  { id: "privacy", label: "Privacy concerns" },
  { id: "switching", label: "Switching to another app" },
  { id: "too_complex", label: "Too complex or hard to use" },
  { id: "missing_features", label: "Missing features I need" },
  { id: "other", label: "Other reason", requiresFeedback: true },
];

// Settings content component
function SettingsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const {
    settings,
    isLoading,
    isSaving,
    updateSettings,
    updateNotificationPreferences,
    updateDisplayPreferences,
    saveSettings,
    requestBrowserNotifications,
  } = useSettings();

  const [activeTab, setActiveTab] = useState("appearance");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<"reason" | "confirm">("reason");
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteFeedback, setDeleteFeedback] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Word count preview state
  const [previewText, setPreviewText] = useState(
    "This is a sample text to preview word count. Type here to see the count update in real-time."
  );
  const wordCount = previewText.trim().split(/\s+/).filter(Boolean).length;

  if (status === "loading" || isLoading) {
    return (
      <div className="container flex h-screen w-screen flex-col items-center justify-center">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  const handleSave = async () => {
    const success = await saveSettings();
    if (success) {
      toast({
        title: "Settings saved",
        description: "Your preferences have been saved successfully.",
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmEmail !== session?.user?.email) {
      toast({
        title: "Email doesn't match",
        description: "Please enter your email address exactly as shown.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      // Call the delete account API
      const response = await fetch("/api/account/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: deleteReason,
          feedback: deleteFeedback,
          confirmEmail,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete account");
      }

      // Clear local storage
      localStorage.clear();

      // Sign out and redirect
      await signOut({ redirect: false });

      toast({
        title: "Account deleted",
        description: "Your account and all data have been permanently deleted.",
      });

      router.push("/");
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleEnableBrowserNotifications = async () => {
    const enabled = await requestBrowserNotifications();
    if (enabled) {
      toast({
        title: "Notifications enabled",
        description: "You'll receive browser notifications for reminders.",
      });
    }
  };

  const selectedReason = DELETION_REASONS.find((r) => r.id === deleteReason);

  return (
    <div className="container py-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your preferences and account
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="display" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Display</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Account</span>
          </TabsTrigger>
        </TabsList>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Theme
              </CardTitle>
              <CardDescription>
                Choose your preferred color theme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => {
                    setTheme("light");
                    updateSettings({ theme: "light" });
                  }}
                  className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    settings.theme === "light"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <Sun className="h-6 w-6 text-amber-600" />
                  </div>
                  <span className="font-medium">Light</span>
                </button>
                <button
                  onClick={() => {
                    setTheme("dark");
                    updateSettings({ theme: "dark" });
                  }}
                  className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    settings.theme === "dark"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                    <Moon className="h-6 w-6 text-slate-200" />
                  </div>
                  <span className="font-medium">Dark</span>
                </button>
                <button
                  onClick={() => {
                    setTheme("system");
                    updateSettings({ theme: "system" });
                  }}
                  className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    settings.theme === "system"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-100 to-slate-800 flex items-center justify-center">
                    <Monitor className="h-6 w-6 text-slate-600" />
                  </div>
                  <span className="font-medium">System</span>
                </button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Date Format
              </CardTitle>
              <CardDescription>
                Choose how dates are displayed throughout the app
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={settings.dateFormat}
                onValueChange={(value: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD") =>
                  updateSettings({ dateFormat: value })
                }
              >
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Select date format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MM/DD/YYYY">
                    MM/DD/YYYY (12/07/2025)
                  </SelectItem>
                  <SelectItem value="DD/MM/YYYY">
                    DD/MM/YYYY (07/12/2025)
                  </SelectItem>
                  <SelectItem value="YYYY-MM-DD">
                    YYYY-MM-DD (2025-12-07)
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Browser Notifications
              </CardTitle>
              <CardDescription>
                Get notified about reminders and updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  {settings.notificationPreferences.browserNotifications ? (
                    <Bell className="h-5 w-5 text-primary" />
                  ) : (
                    <BellOff className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">Browser Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications in your browser
                    </p>
                  </div>
                </div>
                {settings.notificationPreferences.browserNotifications ? (
                  <Switch
                    checked={true}
                    onCheckedChange={(checked) =>
                      updateNotificationPreferences({ browserNotifications: checked })
                    }
                  />
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEnableBrowserNotifications}
                  >
                    Enable
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email_notifications" className="font-medium">
                    Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive updates via email
                  </p>
                </div>
                <Switch
                  id="email_notifications"
                  checked={settings.notificationPreferences.emailNotifications}
                  onCheckedChange={(checked) =>
                    updateNotificationPreferences({ emailNotifications: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="journal_reminders" className="font-medium">
                    Daily Journal Reminders
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get reminded to write in your journal
                  </p>
                </div>
                <Switch
                  id="journal_reminders"
                  checked={settings.notificationPreferences.journalReminders}
                  onCheckedChange={(checked) =>
                    updateNotificationPreferences({ journalReminders: checked })
                  }
                />
              </div>

              {settings.notificationPreferences.journalReminders && (
                <div className="pl-4 border-l-2 border-primary/20">
                  <Label htmlFor="reminder_time" className="font-medium">
                    Reminder Time
                  </Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reminder_time"
                      type="time"
                      value={settings.notificationPreferences.reminderTime}
                      onChange={(e) =>
                        updateNotificationPreferences({ reminderTime: e.target.value })
                      }
                      className="w-32"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Display Tab */}
        <TabsContent value="display" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5" />
                Default View
              </CardTitle>
              <CardDescription>
                Choose how journal entries are displayed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => updateDisplayPreferences({ defaultView: "list" })}
                  className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    settings.displayPreferences.defaultView === "list"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <List className="h-8 w-8" />
                  <span className="font-medium">List</span>
                </button>
                <button
                  onClick={() => updateDisplayPreferences({ defaultView: "grid" })}
                  className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    settings.displayPreferences.defaultView === "grid"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <LayoutGrid className="h-8 w-8" />
                  <span className="font-medium">Grid</span>
                </button>
                <button
                  onClick={() => updateDisplayPreferences({ defaultView: "calendar" })}
                  className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    settings.displayPreferences.defaultView === "calendar"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Calendar className="h-8 w-8" />
                  <span className="font-medium">Calendar</span>
                </button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Display Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="entries_per_page">Entries Per Page</Label>
                <Select
                  value={settings.displayPreferences.entriesPerPage.toString()}
                  onValueChange={(value) =>
                    updateDisplayPreferences({ entriesPerPage: parseInt(value) })
                  }
                >
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="show_word_count" className="font-medium">
                    Show Word Count
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Display word count while writing
                  </p>
                </div>
                <Switch
                  id="show_word_count"
                  checked={settings.displayPreferences.showWordCount}
                  onCheckedChange={(checked) =>
                    updateDisplayPreferences({ showWordCount: checked })
                  }
                />
              </div>

              {settings.displayPreferences.showWordCount && (
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm">Word Count Preview</Label>
                    <span className="text-sm font-mono bg-primary/10 text-primary px-2 py-1 rounded">
                      {wordCount} words
                    </span>
                  </div>
                  <Textarea
                    value={previewText}
                    onChange={(e) => setPreviewText(e.target.value)}
                    placeholder="Type to see word count..."
                    className="min-h-[100px] resize-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="show_insights" className="font-medium">
                    Show AI Insights
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Display AI-generated insights on entries
                  </p>
                </div>
                <Switch
                  id="show_insights"
                  checked={settings.displayPreferences.showInsights}
                  onCheckedChange={(checked) =>
                    updateDisplayPreferences({ showInsights: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>
                Your account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  {session?.user?.image ? (
                    <img
                      src={session.user.image}
                      alt="Profile"
                      className="w-16 h-16 rounded-full"
                    />
                  ) : (
                    <User className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-lg">{session?.user?.name || "User"}</p>
                  <p className="text-muted-foreground">{session?.user?.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={session?.user?.name || ""}
                  disabled
                  className="bg-muted/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={session?.user?.email || ""}
                  disabled
                  className="bg-muted/50"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible actions that affect your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-destructive">Delete Account</p>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all associated data
                    </p>
                  </div>
                  <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="shrink-0">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-md">
                      {deleteStep === "reason" ? (
                        <>
                          <AlertDialogHeader>
                            <AlertDialogTitle>We&apos;re sorry to see you go</AlertDialogTitle>
                            <AlertDialogDescription>
                              Before you delete your account, please let us know why you&apos;re leaving.
                              This helps us improve Reflekt for others.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="space-y-3 py-4">
                            {DELETION_REASONS.map((reason) => (
                              <label
                                key={reason.id}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                  deleteReason === reason.id
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="deleteReason"
                                  value={reason.id}
                                  checked={deleteReason === reason.id}
                                  onChange={(e) => setDeleteReason(e.target.value)}
                                  className="sr-only"
                                />
                                <div
                                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                    deleteReason === reason.id
                                      ? "border-primary"
                                      : "border-muted-foreground"
                                  }`}
                                >
                                  {deleteReason === reason.id && (
                                    <div className="w-2 h-2 rounded-full bg-primary" />
                                  )}
                                </div>
                                <span>{reason.label}</span>
                              </label>
                            ))}
                            {selectedReason?.requiresFeedback && (
                              <Textarea
                                placeholder="Please tell us more..."
                                value={deleteFeedback}
                                onChange={(e) => setDeleteFeedback(e.target.value)}
                                className="mt-2"
                              />
                            )}
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setDeleteReason("")}>
                              Cancel
                            </AlertDialogCancel>
                            <Button
                              variant="destructive"
                              disabled={!deleteReason}
                              onClick={() => setDeleteStep("confirm")}
                            >
                              Continue
                            </Button>
                          </AlertDialogFooter>
                        </>
                      ) : (
                        <>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-destructive">
                              Confirm Account Deletion
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This action is <strong>permanent and cannot be undone</strong>.
                              All your journal entries, insights, and settings will be permanently deleted.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                              <p className="text-sm text-destructive">
                                To confirm, type your email address: <strong>{session?.user?.email}</strong>
                              </p>
                            </div>
                            <Input
                              placeholder="Enter your email"
                              value={confirmEmail}
                              onChange={(e) => setConfirmEmail(e.target.value)}
                            />
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel
                              onClick={() => {
                                setDeleteStep("reason");
                                setConfirmEmail("");
                              }}
                            >
                              Back
                            </AlertDialogCancel>
                            <Button
                              variant="destructive"
                              disabled={confirmEmail !== session?.user?.email || isDeleting}
                              onClick={handleDeleteAccount}
                            >
                              {isDeleting ? (
                                <>
                                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete My Account
                                </>
                              )}
                            </Button>
                          </AlertDialogFooter>
                        </>
                      )}
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Settings page with ClientOnly wrapper
export default function SettingsPage() {
  return (
    <ClientOnly>
      <SettingsContent />
    </ClientOnly>
  );
}
