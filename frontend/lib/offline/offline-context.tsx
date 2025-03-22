'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type OfflineContextType = {
  isOnline: boolean;
  pendingActions: any[];
  addPendingAction: (action: any) => void;
  processPendingActions: () => Promise<void>;
};

const OfflineContext = createContext<OfflineContextType | null>(null);

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingActions, setPendingActions] = useState<any[]>([]);

  useEffect(() => {
    // Set up listeners for online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial status
    setIsOnline(navigator.onLine);

    // Load any pending actions from storage
    const loadPendingActions = () => {
      try {
        const stored = localStorage.getItem('pendingActions');
        if (stored) {
          setPendingActions(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Failed to load pending actions:', error);
      }
    };

    loadPendingActions();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save pending actions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('pendingActions', JSON.stringify(pendingActions));
  }, [pendingActions]);

  // Process pending actions when we come back online
  useEffect(() => {
    if (isOnline && pendingActions.length > 0) {
      processPendingActions();
    }
  }, [isOnline]);

  const addPendingAction = (action: any) => {
    setPendingActions((prev) => [...prev, action]);
  };

  const processPendingActions = async () => {
    if (pendingActions.length === 0) return;

    try {
      // Process each pending action
      // This would be implementation-specific based on your app's needs
      const newPendingActions = [...pendingActions];
      
      for (let i = 0; i < newPendingActions.length; i++) {
        const action = newPendingActions[i];
        try {
          // Example: if your action is a fetch request
          // await fetch(action.url, action.options);
          
          // Remove the processed action
          newPendingActions.splice(i, 1);
          i--;
        } catch (error) {
          console.error('Failed to process action:', error);
          // We'll keep the action in the queue to try again later
        }
      }
      
      setPendingActions(newPendingActions);
    } catch (error) {
      console.error('Error processing pending actions:', error);
    }
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingActions,
        addPendingAction,
        processPendingActions,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
} 