import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component for AI-related features
 * Catches errors in child components and displays a fallback UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to an error reporting service
    console.error('AI Component error:', error, errorInfo);
    
    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Render custom fallback UI if provided, otherwise render default fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
          <h3 className="text-sm font-medium text-yellow-800">AI Feature Unavailable</h3>
          <p className="mt-2 text-sm text-yellow-700">
            Sorry, we couldn&apos;t load this AI feature.
          </p>
          <div className="mt-3 flex space-x-2">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-3 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-md hover:bg-yellow-200"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional component wrapper for the ErrorBoundary
 * Makes it easier to use with custom fallback UI
 */
export const withAIErrorHandling = (
  Component: React.ComponentType<any>,
  fallbackUI?: React.ReactNode
) => {
  return (props: any) => (
    <ErrorBoundary fallback={fallbackUI}>
      <Component {...props} />
    </ErrorBoundary>
  );
}; 