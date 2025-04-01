import { NextResponse } from "next/server";
import { apiRequest, handleApiError } from "@/lib/api-utils";
import { getAuthSession } from "@/lib/auth-utils";

// Mock user settings
const mockSettings = {
  tenant_id: "tenant123",
  user_id: "user123",
  theme: "system",
  date_format: "MM/DD/YYYY",
  notification_preferences: {
    email_notifications: true,
    reminders_enabled: true,
    reminder_time: "20:00",
  },
  display_preferences: {
    default_view: "list",
    entries_per_page: 10,
    show_word_count: true,
    show_insights: true,
  },
};

// GET: Fetch user settings
export async function GET() {
  return NextResponse.json(mockSettings);
}

// PUT: Update settings
export async function PUT(request: Request) {
  try {
    // Parse the updated settings from the request body
    const updatedSettings = await request.json();

    // In a real implementation, we would save these to the database
    // For now, we just return the updated settings as if they were saved

    return NextResponse.json({
      ...mockSettings,
      ...updatedSettings,
      // Ensure nested objects are properly merged
      notification_preferences: {
        ...mockSettings.notification_preferences,
        ...(updatedSettings.notification_preferences || {}),
      },
      display_preferences: {
        ...mockSettings.display_preferences,
        ...(updatedSettings.display_preferences || {}),
      },
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
  }
}
