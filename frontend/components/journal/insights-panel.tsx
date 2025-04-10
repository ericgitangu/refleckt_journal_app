import React, { useEffect, useState } from 'react';
import { getEntryInsights, EntryInsights as InsightsType } from '../../src/services/api';
import { Skeleton } from "../ui/skeleton";

interface InsightsPanelProps {
  entryId: string;
  isLoading?: boolean;
  insights?: any;
}

export default function InsightsPanel({ entryId, isLoading: externalLoading }: InsightsPanelProps) {
  const [insights, setInsights] = useState<InsightsType | null>(null);
  const [loading, setLoading] = useState(externalLoading !== undefined ? externalLoading : true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getEntryInsights(entryId);
        setInsights(data);
      } catch (err) {
        console.error('Failed to fetch insights:', err);
        setError('Could not load AI insights. The analysis may still be in progress.');
      } finally {
        setLoading(false);
      }
    };

    if (entryId) {
      fetchInsights();
    }
  }, [entryId]);

  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (error) {
    return (
      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
        <h3 className="text-sm font-medium text-yellow-800">AI Insights</h3>
        <p className="mt-2 text-sm text-yellow-700">{error}</p>
        <p className="mt-1 text-xs text-yellow-600">
          AI analysis is typically available a few moments after saving your entry.
        </p>
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
      <h3 className="text-lg font-semibold mb-4">AI Insights</h3>
      
      <div className="space-y-4">
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
          </p>
        </div>
      </div>
    </div>
  );
}
