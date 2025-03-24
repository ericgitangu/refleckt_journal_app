'use client';

import React from 'react';
import { WifiOff, ServerCrash, CloudOff, AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ApiErrorProps {
  statusCode?: number;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ApiError({ 
  statusCode = 500, 
  message = "We couldn't connect to our servers", 
  onRetry,
  className = ""
}: ApiErrorProps) {
  // Choose appropriate icon based on status code
  const getErrorIcon = () => {
    if (statusCode >= 500) {
      return <ServerCrash className="h-5 w-5 text-destructive" />;
    } else if (statusCode === 408 || statusCode === 504) {
      return <CloudOff className="h-5 w-5 text-destructive" />;
    } else if (statusCode === 0 || !statusCode) { // Connection error
      return <WifiOff className="h-5 w-5 text-destructive" />;
    } else {
      return <AlertTriangle className="h-5 w-5 text-destructive" />;
    }
  };

  // Set appropriate error message if not provided
  const getErrorMessage = () => {
    if (message) return message;
    
    if (statusCode >= 500) {
      return "Our servers are currently unavailable. Please try again later.";
    } else if (statusCode === 408 || statusCode === 504) {
      return "The request timed out. Please check your connection and try again.";
    } else if (statusCode === 0 || !statusCode) {
      return "Unable to connect to our services. Please check your network connection.";
    } else if (statusCode === 401) {
      return "You need to be logged in to access this resource.";
    } else if (statusCode === 403) {
      return "You don't have permission to access this resource.";
    } else if (statusCode === 404) {
      return "The requested resource was not found.";
    } else {
      return "Something went wrong. Please try again.";
    }
  };

  return (
    <div className={`rounded-lg border border-destructive/20 bg-destructive/5 p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0 mt-0.5">
          {getErrorIcon()}
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-destructive">
            {statusCode ? `Error ${statusCode}` : 'Connection Error'}
          </h3>
          <div className="mt-2 text-sm text-destructive/80">
            <p>{getErrorMessage()}</p>
          </div>
          {onRetry && (
            <div className="mt-4">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={onRetry}
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 