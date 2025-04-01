"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { ClientOnly } from "@/components/ClientOnly";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserSettings {
  tenant_id: string;
  user_id: string;
  theme?: string;
  date_format?: string;
  notification_preferences?: {
    email_notifications: boolean;
    reminders_enabled: boolean;
    reminder_time?: string;
  };
  display_preferences?: {
    default_view?: string;
    entries_per_page?: number;
    show_word_count?: boolean;
    show_insights?: boolean;
  };
}

// Settings content component that uses React hooks
function SettingsContent() {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("appearance");

  useEffect(() => {
    if (status === "authenticated") {
      fetchSettings();
    }
  }, [status]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/settings");
      if (!response.ok) {
        throw new Error("Failed to fetch settings");
      }
      const data = await response.json();
      setSettings(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching settings:", err);
      setError("Failed to load settings. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    setSuccessMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      setSuccessMessage("Settings saved successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Error saving settings:", err);
      setError("Failed to save settings. Please try again later.");
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (
    key: string,
    value: any,
    nestedKey?: string,
    nestedObjKey?: string,
  ) => {
    if (!settings) return;

    if (nestedKey && nestedObjKey) {
      // For nested preferences like notification_preferences.email_notifications
      setSettings({
        ...settings,
        [nestedObjKey]: {
          ...(settings[nestedObjKey as keyof UserSettings] as any),
          [nestedKey]: value,
        },
      });
    } else {
      // For top level properties
      setSettings({
        ...settings,
        [key]: value,
      });
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="container flex h-screen w-screen flex-col items-center justify-center">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  // Default settings if none found
  const userSettings = settings || {
    tenant_id: "",
    user_id: "",
    theme: "system",
    date_format: "MM/DD/YYYY",
    notification_preferences: {
      email_notifications: false,
      reminders_enabled: false,
    },
    display_preferences: {
      default_view: "list",
      entries_per_page: 10,
      show_word_count: true,
      show_insights: true,
    },
  };

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? (
            <>
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-2 rounded-md mb-4">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400 px-4 py-2 rounded-md mb-4">
          {successMessage}
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="display">Display</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the appearance of your journal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={userSettings.theme || "system"}
                  onValueChange={(value) => updateSettings("theme", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_format">Date Format</Label>
                <Select
                  value={userSettings.date_format || "MM/DD/YYYY"}
                  onValueChange={(value) =>
                    updateSettings("date_format", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select date format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Configure how you want to be notified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="email_notifications">Email Notifications</Label>
                <Switch
                  id="email_notifications"
                  checked={
                    userSettings.notification_preferences
                      ?.email_notifications || false
                  }
                  onCheckedChange={(checked) =>
                    updateSettings(
                      "email_notifications",
                      checked,
                      "email_notifications",
                      "notification_preferences",
                    )
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="reminders_enabled">Daily Reminders</Label>
                <Switch
                  id="reminders_enabled"
                  checked={
                    userSettings.notification_preferences?.reminders_enabled ||
                    false
                  }
                  onCheckedChange={(checked) =>
                    updateSettings(
                      "reminders_enabled",
                      checked,
                      "reminders_enabled",
                      "notification_preferences",
                    )
                  }
                />
              </div>

              {userSettings.notification_preferences?.reminders_enabled && (
                <div className="space-y-2">
                  <Label htmlFor="reminder_time">Reminder Time</Label>
                  <Input
                    id="reminder_time"
                    type="time"
                    value={
                      userSettings.notification_preferences?.reminder_time ||
                      "20:00"
                    }
                    onChange={(e) =>
                      updateSettings(
                        "reminder_time",
                        e.target.value,
                        "reminder_time",
                        "notification_preferences",
                      )
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="display" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Display Settings</CardTitle>
              <CardDescription>
                Customize how your journal entries are displayed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="default_view">Default View</Label>
                <Select
                  value={
                    userSettings.display_preferences?.default_view || "list"
                  }
                  onValueChange={(value) =>
                    updateSettings(
                      "default_view",
                      value,
                      "default_view",
                      "display_preferences",
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select default view" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="list">List</SelectItem>
                    <SelectItem value="grid">Grid</SelectItem>
                    <SelectItem value="calendar">Calendar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="entries_per_page">Entries Per Page</Label>
                <Input
                  id="entries_per_page"
                  type="number"
                  min="5"
                  max="50"
                  value={
                    userSettings.display_preferences?.entries_per_page || 10
                  }
                  onChange={(e) =>
                    updateSettings(
                      "entries_per_page",
                      parseInt(e.target.value, 10),
                      "entries_per_page",
                      "display_preferences",
                    )
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show_word_count">Show Word Count</Label>
                <Switch
                  id="show_word_count"
                  checked={
                    userSettings.display_preferences?.show_word_count || false
                  }
                  onCheckedChange={(checked) =>
                    updateSettings(
                      "show_word_count",
                      checked,
                      "show_word_count",
                      "display_preferences",
                    )
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show_insights">Show AI Insights</Label>
                <Switch
                  id="show_insights"
                  checked={
                    userSettings.display_preferences?.show_insights || false
                  }
                  onCheckedChange={(checked) =>
                    updateSettings(
                      "show_insights",
                      checked,
                      "show_insights",
                      "display_preferences",
                    )
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Manage your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={session?.user?.name || ""} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={session?.user?.email || ""} disabled />
              </div>

              <div className="pt-4">
                <Button variant="destructive">Delete Account</Button>
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
