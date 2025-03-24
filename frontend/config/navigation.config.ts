import {
  Home,
  BookOpen,
  Settings,
  BarChart,
  Brain,
  MessageSquare,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: any;
  description?: string;
  requiresAuth?: boolean;
  showInNav?: boolean;
}

export const navigation: NavItem[] = [
  {
    title: "Home",
    href: "/",
    icon: Home,
    description: "Welcome to Reflekt Journal",
    showInNav: false,
  },
  {
    title: "Journal",
    href: "/journal",
    icon: BookOpen,
    description: "Write and reflect on your thoughts",
    requiresAuth: true,
    showInNav: true,
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart,
    description: "View your journaling insights and patterns",
    requiresAuth: true,
    showInNav: true,
  },
  {
    title: "AI Insights",
    href: "/ai-insights",
    icon: Brain,
    description: "Get AI-powered insights from your entries",
    requiresAuth: true,
    showInNav: true,
  },
  {
    title: "Prompts",
    href: "/prompts",
    icon: MessageSquare,
    description: "Explore writing prompts and inspiration",
    requiresAuth: true,
    showInNav: true,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Manage your account and preferences",
    requiresAuth: true,
    showInNav: true,
  },
];

export const authRoutes = {
  login: "/login",
  signup: "/signup",
  logout: "/logout",
  error: "/auth/error",
};

export const getInitials = (name: string): string => {
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name[0].toUpperCase();
};
