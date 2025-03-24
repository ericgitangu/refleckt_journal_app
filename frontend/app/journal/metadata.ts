import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Journal - Reflekt",
  description: "Your personal journal entries",
  openGraph: {
    title: "Journal - Reflekt",
    description: "Your personal journal entries",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};
