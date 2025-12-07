import { NextResponse } from "next/server";
import { apiRequest, handleApiError } from "@/lib/api-utils";
import { getAuthSession } from "@/lib/auth-utils";

// Default settings for new users or fallback
const defaultSettings = {
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
  try {
    // Get authentication session
    const session = await getAuthSession();
    if (!session) {
      // Return default settings when not authenticated
      // This prevents UI errors while maintaining functionality
      console.warn("No session found, returning default settings");
      return NextResponse.json(defaultSettings);
    }

    // Forward request to backend API
    const response = await apiRequest("/settings");
    return NextResponse.json(response.data);
  } catch (error) {
    // If backend fails, return default settings so UI still works
    console.error("Failed to fetch settings from backend:", error);
    return NextResponse.json(defaultSettings);
  }
}

// PUT: Update settings
export async function PUT(request: Request) {
  try {
    // Get authentication session
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse the updated settings from the request body
    const updatedSettings = await request.json();

    // Forward request to backend API
    const response = await apiRequest("/settings", "PUT", updatedSettings);
    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error, "Failed to update settings");
  }
}
