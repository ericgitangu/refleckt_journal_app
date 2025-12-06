export interface NotificationPreferences {
  emailNotifications: boolean;
  journalReminders: boolean;
  reminderTime: string;
  browserNotifications: boolean;
}

export interface DisplayPreferences {
  defaultView: "list" | "grid" | "calendar";
  entriesPerPage: number;
  showWordCount: boolean;
  showInsights: boolean;
}

export interface UserSettings {
  id?: string;
  userId?: string;
  theme: "light" | "dark" | "system";
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
  timeFormat: "12h" | "24h";
  language: string;
  privacyLevel: "private" | "friends" | "public";
  notificationPreferences: NotificationPreferences;
  displayPreferences: DisplayPreferences;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "system",
  dateFormat: "MM/DD/YYYY",
  timeFormat: "12h",
  language: "en",
  privacyLevel: "private",
  notificationPreferences: {
    emailNotifications: false,
    journalReminders: false,
    reminderTime: "20:00",
    browserNotifications: false,
  },
  displayPreferences: {
    defaultView: "list",
    entriesPerPage: 10,
    showWordCount: true,
    showInsights: true,
  },
};

// Account deletion request type
export interface AccountDeletionRequest {
  reason: string;
  feedback?: string;
  confirmEmail: string;
}

export interface AccountDeletionReason {
  id: string;
  label: string;
  requiresFeedback?: boolean;
}
