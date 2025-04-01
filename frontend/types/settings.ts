export interface UserSettings {
  id?: string;
  userId?: string;
  theme?: "light" | "dark" | "system";
  emailNotifications?: boolean;
  journalReminders?: boolean;
  privacyLevel?: "private" | "friends" | "public";
  dateFormat?: string;
  timeFormat?: string;
  language?: string;
  createdAt?: string;
  updatedAt?: string;
}
