"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { ReactErrorBoundary as ErrorUI } from "@/components/ui/error-boundary";

interface ErrorBoundaryProps {
  fallbackUI?: "minimal" | "full";
  title?: string;
  description?: string;
  showDetails?: boolean;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// This is a client component that should never be executed during static generation
export class TrueErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  // Prevent React hooks from running during static generation
  componentDidMount() {
    // This ensures the component only runs in a browser context
    if (typeof window === "undefined") {
      console.warn("ErrorBoundary should not be used during static generation");
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Error caught by error boundary:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <ErrorUI
          error={this.state.error}
          reset={() => this.setState({ hasError: false, error: null })}
          title={this.props.title || "Something went wrong"}
          showDetails={this.props.showDetails || false}
          variant={this.props.fallbackUI || "full"}
        />
      );
    }

    return this.props.children;
  }
}
