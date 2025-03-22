import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function HealthStatusSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>
            <Skeleton className="h-6 w-[200px]" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-[150px]" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-[300px]" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-[180px]" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-[240px]" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ServiceStatusSkeleton />
            <ServiceStatusSkeleton />
            <ServiceStatusSkeleton />
            <ServiceStatusSkeleton />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ServiceStatusSkeleton() {
  return (
    <Card className="border-l-4 border-l-transparent border-l-gray-200">
      <CardContent className="p-4 flex justify-between items-center">
        <div>
          <Skeleton className="h-5 w-[150px] mb-2" />
          <Skeleton className="h-3 w-[200px]" />
        </div>
        <div className="text-right">
          <Skeleton className="h-5 w-[70px] mb-2" />
          <Skeleton className="h-3 w-[40px]" />
        </div>
      </CardContent>
    </Card>
  );
} 