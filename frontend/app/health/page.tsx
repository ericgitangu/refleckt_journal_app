import { Suspense } from 'react';
import { HealthDashboard } from '@/components/health/HealthDashboard';
import { HealthStatusSkeleton } from '@/components/health/HealthStatusSkeleton';

export const metadata = {
  title: 'System Health - Reflekt Journal',
  description: 'Monitor the health of Reflekt Journal backend services',
};

export default function HealthPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">System Health</h1>
        <p className="text-muted-foreground">
          Monitor the status and performance of backend services
        </p>
      </div>
      
      <Suspense fallback={<HealthStatusSkeleton />}>
        <HealthDashboard />
      </Suspense>
    </div>
  );
} 