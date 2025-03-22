import { NextResponse } from 'next/server';
import { apiRequest, handleApiError } from '@/lib/api-utils';

// GET: Fetch analytics data
export async function GET() {
  try {
    const response = await apiRequest('/analytics');
    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch analytics');
  }
}

// POST: Request analytics generation
export async function POST() {
  try {
    const response = await apiRequest('/analytics', 'POST');
    return NextResponse.json(response.data, { status: 202 });
  } catch (error) {
    return handleApiError(error, 'Failed to request analytics generation');
  }
} 