import React from 'react';
import { useAIInsights } from '@/hooks/useAIInsights';
import { Skeleton } from "../ui/skeleton";
import { ErrorBoundary } from './ErrorBoundary';

interface EntryInsightsProps {
  entryId: string;
}

function EntryInsightsContent({ entryId }: EntryInsightsProps) {
  const { insights, loading, error, isFromCache, refetch } = useAIInsights(entryId);

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="mt-4">
            <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
        <h3 className="text-sm font-medium text-yellow-800">AI Insights</h3>
        <p className="mt-2 text-sm text-yellow-700">{error.message}</p>
        <p className="mt-1 text-xs text-yellow-600">
          AI analysis is typically available a few moments after saving your entry.
        </p>
        <button 
          onClick={() => refetch()}
          className="mt-2 px-3 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-md hover:bg-yellow-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
        <h3 className="text-sm font-medium text-gray-700">AI Insights</h3>
        <p className="mt-2 text-sm text-gray-600">
          No insights available for this entry yet.
        </p>
      </div>
    );
  }

  // Determine sentiment color
  const sentimentColor = 
    insights.sentiment === 'positive' ? 'text-green-700' :
    insights.sentiment === 'negative' ? 'text-red-700' :
    'text-gray-700';

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="flex justify-between items-start">
        <h3 className="font-medium text-gray-900">AI Insights</h3>
        {isFromCache && (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Cached</span>
        )}
      </div>
      
      <div className="space-y-4 mt-4">
        {/* Sentiment */}
        <div>
          <h4 className="text-xs uppercase tracking-wide text-gray-500">Sentiment</h4>
          <p className={`text-sm font-medium mt-1 ${sentimentColor}`}>
            {insights.sentiment.charAt(0).toUpperCase() + insights.sentiment.slice(1)}
            <span className="ml-1 text-xs">
              ({insights.sentimentScore > 0 ? '+' : ''}{insights.sentimentScore.toFixed(2)})
            </span>
          </p>
        </div>

        {/* Keywords */}
        <div>
          <h4 className="text-xs uppercase tracking-wide text-gray-500">Keywords</h4>
          <div className="flex flex-wrap gap-1 mt-1">
            {insights.keywords.map((keyword, index) => (
              <span 
                key={index}
                className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded-full"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>

        {/* Suggested Categories */}
        <div>
          <h4 className="text-xs uppercase tracking-wide text-gray-500">Suggested Categories</h4>
          <div className="flex flex-wrap gap-1 mt-1">
            {insights.suggestedCategories.map((category, index) => (
              <span 
                key={index}
                className="px-2 py-0.5 text-xs bg-purple-50 text-purple-700 rounded-full"
              >
                {category}
              </span>
            ))}
          </div>
        </div>

        {/* Insights */}
        {insights.insights && (
          <div>
            <h4 className="text-xs uppercase tracking-wide text-gray-500">Insight</h4>
            <p className="text-sm text-gray-700 mt-1">{insights.insights}</p>
          </div>
        )}

        {/* Reflective Question */}
        {insights.reflections && (
          <div>
            <h4 className="text-xs uppercase tracking-wide text-gray-500">Reflective Question</h4>
            <p className="text-sm italic text-gray-700 mt-1">{insights.reflections}</p>
          </div>
        )}

        {/* Provider Attribution */}
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Analysis by {insights.provider.charAt(0).toUpperCase() + insights.provider.slice(1)}
            {isFromCache && insights._timestamp && 
              <span className="ml-1">(cached {new Date(insights._timestamp).toLocaleDateString()})</span>
            }
          </p>
        </div>
      </div>
    </div>
  );
}

export function EntryInsights(props: EntryInsightsProps) {
  return (
    <ErrorBoundary>
      <EntryInsightsContent {...props} />
    </ErrorBoundary>
  );
} 