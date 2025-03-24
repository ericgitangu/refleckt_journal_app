"use client";

import React from "react";

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="flex-1 w-full flex flex-col gap-4 md:gap-8 px-4 md:px-6 py-6 lg:py-8">
      <div className="max-w-6xl w-full mx-auto flex flex-col gap-4 md:gap-8">
        {children}
      </div>
    </div>
  );
}
