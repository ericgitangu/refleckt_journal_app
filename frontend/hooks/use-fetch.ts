import { useState, useEffect, useCallback } from 'react';
import axios, { AxiosRequestConfig } from 'axios';

interface FetchState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

interface FetchOptions extends AxiosRequestConfig {
  skipInitialFetch?: boolean;
}

/**
 * Custom hook for data fetching with loading and error states
 * @param url - The URL to fetch data from
 * @param options - Axios request config plus custom options
 * @returns Fetch state and refetch function
 */
export function useFetch<T = any>(
  url: string, 
  options: FetchOptions = {}
) {
  const { skipInitialFetch = false, ...axiosOptions } = options;
  
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    isLoading: !skipInitialFetch,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState((prev: FetchState<T>) => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await axios({
        url,
        ...axiosOptions,
      });
      
      setState({
        data: response.data,
        isLoading: false,
        error: null,
      });
      
      return response.data;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Unknown error');
      
      setState({
        data: null,
        isLoading: false,
        error: errorObj,
      });
      
      throw errorObj;
    }
  }, [url, axiosOptions]);

  useEffect(() => {
    if (!skipInitialFetch) {
      fetchData();
    }
  }, [fetchData, skipInitialFetch]);

  return {
    ...state,
    refetch: fetchData,
  };
} 