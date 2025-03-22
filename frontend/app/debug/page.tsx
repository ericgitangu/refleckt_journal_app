import { Suspense } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ServiceDebugMonitor } from '@/components/debug/ServiceDebugMonitor';
import { DebugMonitorSkeleton } from '@/components/debug/DebugMonitorSkeleton';

export const metadata = {
  title: 'Debug Dashboard - Reflekt Journal',
  description: 'Debug and monitor Reflekt Journal services',
};

export default function DebugPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Debug Dashboard</h1>
        <p className="text-muted-foreground">
          Debug and monitor backend services
        </p>
      </div>
      
      <Tabs defaultValue="entries">
        <Card>
          <CardHeader>
            <CardTitle>Service Monitors</CardTitle>
            <CardDescription>
              Debug information for each service
            </CardDescription>
            <TabsList className="mt-2">
              <TabsTrigger value="entries">Entries</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="ai">AI Service</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            <TabsContent value="entries">
              <Suspense fallback={<DebugMonitorSkeleton />}>
                <ServiceDebugMonitor serviceName="entry-service" />
              </Suspense>
            </TabsContent>
            <TabsContent value="settings">
              <Suspense fallback={<DebugMonitorSkeleton />}>
                <ServiceDebugMonitor serviceName="settings-service" />
              </Suspense>
            </TabsContent>
            <TabsContent value="analytics">
              <Suspense fallback={<DebugMonitorSkeleton />}>
                <ServiceDebugMonitor serviceName="analytics-service" />
              </Suspense>
            </TabsContent>
            <TabsContent value="ai">
              <Suspense fallback={<DebugMonitorSkeleton />}>
                <ServiceDebugMonitor serviceName="ai-service" />
              </Suspense>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
} 