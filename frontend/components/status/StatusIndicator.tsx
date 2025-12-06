"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useOverallStatus } from "@/hooks/useServiceStatus";
import type { ServiceHealthStatus, OverallStatus } from "@/types/status";

interface StatusIndicatorProps {
  status?: ServiceHealthStatus | OverallStatus;
  size?: "xs" | "sm" | "md" | "lg";
  showLabel?: boolean;
  showPulse?: boolean;
  className?: string;
  onClick?: () => void;
  asLink?: boolean;
}

// Status color mappings
const STATUS_COLORS: Record<
  ServiceHealthStatus | OverallStatus | "unknown",
  {
    bg: string;
    ring: string;
    pulse: string;
    text: string;
    label: string;
  }
> = {
  operational: {
    bg: "bg-emerald-500",
    ring: "ring-emerald-500/30",
    pulse: "bg-emerald-400",
    text: "text-emerald-600 dark:text-emerald-400",
    label: "All Systems Operational",
  },
  all_operational: {
    bg: "bg-emerald-500",
    ring: "ring-emerald-500/30",
    pulse: "bg-emerald-400",
    text: "text-emerald-600 dark:text-emerald-400",
    label: "All Systems Operational",
  },
  degraded: {
    bg: "bg-yellow-500",
    ring: "ring-yellow-500/30",
    pulse: "bg-yellow-400",
    text: "text-yellow-600 dark:text-yellow-400",
    label: "Degraded Performance",
  },
  degraded_performance: {
    bg: "bg-yellow-500",
    ring: "ring-yellow-500/30",
    pulse: "bg-yellow-400",
    text: "text-yellow-600 dark:text-yellow-400",
    label: "Degraded Performance",
  },
  partial_outage: {
    bg: "bg-orange-500",
    ring: "ring-orange-500/30",
    pulse: "bg-orange-400",
    text: "text-orange-600 dark:text-orange-400",
    label: "Partial Outage",
  },
  major_outage: {
    bg: "bg-red-500",
    ring: "ring-red-500/30",
    pulse: "bg-red-400",
    text: "text-red-600 dark:text-red-400",
    label: "Major Outage",
  },
  maintenance: {
    bg: "bg-blue-500",
    ring: "ring-blue-500/30",
    pulse: "bg-blue-400",
    text: "text-blue-600 dark:text-blue-400",
    label: "Under Maintenance",
  },
  unknown: {
    bg: "bg-gray-400",
    ring: "ring-gray-400/30",
    pulse: "bg-gray-300",
    text: "text-gray-500 dark:text-gray-400",
    label: "Checking Status...",
  },
};

// Size configurations
const SIZE_CLASSES = {
  xs: {
    dot: "h-1.5 w-1.5",
    ring: "ring-1",
    text: "text-[10px]",
    gap: "gap-1",
  },
  sm: {
    dot: "h-2 w-2",
    ring: "ring-2",
    text: "text-xs",
    gap: "gap-1.5",
  },
  md: {
    dot: "h-2.5 w-2.5",
    ring: "ring-2",
    text: "text-sm",
    gap: "gap-2",
  },
  lg: {
    dot: "h-3 w-3",
    ring: "ring-2",
    text: "text-base",
    gap: "gap-2",
  },
};

/**
 * Status indicator dot component
 * Can be used standalone or as part of a larger status display
 */
export function StatusDot({
  status = "unknown",
  size = "sm",
  showPulse = true,
  className,
}: {
  status?: ServiceHealthStatus | OverallStatus | "unknown";
  size?: "xs" | "sm" | "md" | "lg";
  showPulse?: boolean;
  className?: string;
}) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.unknown;
  const sizeConfig = SIZE_CLASSES[size];

  const shouldPulse =
    showPulse &&
    (status === "operational" ||
      status === "all_operational" ||
      status === "unknown");

  return (
    <span className={cn("relative inline-flex", className)}>
      {shouldPulse && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
            colors.pulse,
          )}
          style={{ animationDuration: "2s" }}
        />
      )}
      <span
        className={cn(
          "relative inline-flex rounded-full ring",
          sizeConfig.dot,
          sizeConfig.ring,
          colors.bg,
          colors.ring,
        )}
      />
    </span>
  );
}

/**
 * Full status indicator with optional label
 */
export function StatusIndicator({
  status,
  size = "sm",
  showLabel = false,
  showPulse = true,
  className,
  onClick,
  asLink = false,
}: StatusIndicatorProps) {
  const colors = STATUS_COLORS[status || "unknown"] || STATUS_COLORS.unknown;
  const sizeConfig = SIZE_CLASSES[size];

  const content = (
    <span
      className={cn(
        "inline-flex items-center",
        sizeConfig.gap,
        onClick && "cursor-pointer hover:opacity-80 transition-opacity",
        className,
      )}
      onClick={onClick}
    >
      <StatusDot status={status} size={size} showPulse={showPulse} />
      {showLabel && (
        <span className={cn("font-medium", sizeConfig.text, colors.text)}>
          {colors.label}
        </span>
      )}
    </span>
  );

  if (asLink) {
    return (
      <Link href="/status" className="inline-flex">
        {content}
      </Link>
    );
  }

  return content;
}

/**
 * Live status indicator that auto-fetches and updates
 * Ideal for footer placement
 */
export function LiveStatusIndicator({
  size = "xs",
  showLabel = true,
  className,
}: {
  size?: "xs" | "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}) {
  const { status, isLoading } = useOverallStatus();

  return (
    <Link
      href="/status"
      className={cn(
        "inline-flex items-center transition-all hover:opacity-80",
        SIZE_CLASSES[size].gap,
        className,
      )}
      title={`System Status: ${STATUS_COLORS[status]?.label || "Checking..."}`}
    >
      <StatusDot
        status={isLoading ? "unknown" : status}
        size={size}
        showPulse={!isLoading}
      />
      {showLabel && (
        <span
          className={cn(
            "font-medium transition-colors",
            SIZE_CLASSES[size].text,
            isLoading
              ? "text-gray-400"
              : STATUS_COLORS[status]?.text || "text-gray-400",
          )}
        >
          {isLoading ? "Checking..." : "System Status"}
        </span>
      )}
    </Link>
  );
}

/**
 * Compact status badge for cards and lists
 */
export function StatusBadge({
  status,
  className,
}: {
  status: ServiceHealthStatus | OverallStatus;
  className?: string;
}) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.unknown;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
        colors.bg.replace("bg-", "bg-opacity-10 bg-"),
        colors.text,
        className,
      )}
    >
      <StatusDot status={status} size="xs" showPulse={false} />
      {colors.label}
    </span>
  );
}

export default StatusIndicator;
