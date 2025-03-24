'use client';

import React, { useEffect, useState } from 'react';
import { debugLogger, DebugLog } from '../utils/debug';
import { isDevelopment } from '../utils/environment';

interface DebugPanelProps {
  className?: string;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ className = '' }) => {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const updateLogs = () => {
      setLogs(debugLogger.getLogs());
    };

    // Update logs every second
    const interval = setInterval(updateLogs, 1000);
    updateLogs(); // Initial update

    return () => clearInterval(interval);
  }, []);

  if (!isDevelopment) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-0 right-0 bg-gray-900 text-white p-4 rounded-tl-lg shadow-lg z-50 ${
        isOpen ? 'w-96 h-96' : 'w-12 h-12'
      } ${className}`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-2 right-2 text-white hover:text-gray-300"
      >
        {isOpen ? '×' : 'D'}
      </button>

      {isOpen && (
        <div className="h-full flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold">Debug Panel</h3>
            <div className="space-x-2">
              <button
                onClick={() => debugLogger.clearLogs()}
                className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 rounded"
              >
                Clear
              </button>
              <button
                onClick={() => debugLogger.downloadLogs()}
                className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded"
              >
                Download
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto text-xs font-mono">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`mb-2 p-2 rounded ${
                  log.type === 'error'
                    ? 'bg-red-900'
                    : log.type === 'warning'
                    ? 'bg-yellow-900'
                    : 'bg-gray-800'
                }`}
              >
                <div className="text-gray-400">{log.timestamp}</div>
                <div className="font-semibold">{log.message}</div>
                {log.data && (
                  <pre className="mt-1 text-gray-300">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                )}
                {log.headers && (
                  <pre className="mt-1 text-gray-300">
                    {JSON.stringify(log.headers, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 