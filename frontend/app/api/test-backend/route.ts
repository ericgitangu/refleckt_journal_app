import { NextResponse } from 'next/server';
import axios from 'axios';

interface TestResult {
  service: string;
  endpoint: string;
  status: 'success' | 'failed';
  statusCode?: number;
  message?: string;
  latency: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export async function GET() {
  const testResults: TestResult[] = [];
  
  // Define endpoints to test
  const endpoints = [
    { service: 'entries', endpoint: '/entries' },
    { service: 'settings', endpoint: '/settings' },
    { service: 'analytics', endpoint: '/analytics' },
    { service: 'health', endpoint: '/health' }
  ];
  
  // Test each endpoint
  for (const { service, endpoint } of endpoints) {
    const fullUrl = `${API_URL}${endpoint}`;
    const start = Date.now();
    
    try {
      const response = await axios.get(fullUrl, {
        headers: {
          'Content-Type': 'application/json',
          'x-test-request': 'true'
        },
        timeout: 5000
      });
      
      const latency = Date.now() - start;
      
      testResults.push({
        service,
        endpoint,
        status: 'success',
        statusCode: response.status,
        message: `Successfully connected to ${service}`,
        latency
      });
    } catch (error) {
      const latency = Date.now() - start;
      
      if (axios.isAxiosError(error)) {
        testResults.push({
          service,
          endpoint,
          status: 'failed',
          statusCode: error.response?.status,
          message: error.message,
          latency
        });
      } else {
        testResults.push({
          service,
          endpoint,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          latency
        });
      }
    }
  }
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    results: testResults,
    success: testResults.every(result => result.status === 'success')
  });
} 