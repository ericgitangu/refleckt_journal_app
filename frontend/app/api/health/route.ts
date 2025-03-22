import { NextResponse } from 'next/server';
import axios from 'axios';
import { apiRequest } from '@/lib/api-utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface ServiceCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  message?: string;
}

export async function GET() {
  const services = [
    'entry-service',
    'settings-service',
    'analytics-service',
    'ai-service'
  ];

  const results: ServiceCheck[] = [];
  
  // Health check doesn't require authentication
  for (const service of services) {
    const start = Date.now();
    try {
      const serviceEndpoint = `/${service.replace('-service', '')}`;
      
      // Use our apiRequest but with requireAuth: false
      await apiRequest(serviceEndpoint, 'GET', undefined, { requireAuth: false });
      
      const latency = Date.now() - start;
      
      results.push({
        name: service,
        status: 'healthy',
        latency,
      });
    } catch (error) {
      const latency = Date.now() - start;
      
      if (axios.isAxiosError(error)) {
        // If we get a 401, that's actually good - it means the service is up
        // but requires authentication
        if (error.response?.status === 401) {
          results.push({
            name: service,
            status: 'healthy',
            latency,
            message: 'Service requires authentication'
          });
        } else {
          results.push({
            name: service,
            status: 'degraded',
            latency,
            message: `Service returned ${error.response?.status} status code`
          });
        }
      } else {
        results.push({
          name: service,
          status: 'unhealthy',
          latency,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }
  
  // Calculate overall status
  const hasUnhealthy = results.some(r => r.status === 'unhealthy');
  const hasDegraded = results.some(r => r.status === 'degraded');
  
  const overallStatus = hasUnhealthy 
    ? 'unhealthy' 
    : hasDegraded ? 'degraded' : 'healthy';
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    status: overallStatus,
    services: results
  });
} 