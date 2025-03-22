import { NextResponse } from 'next/server';
import { apiRequest, handleApiError } from '@/lib/api-utils';

// GET: Fetch user settings
export async function GET() {
  try {
    const response = await apiRequest('/settings');
    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch settings');
  }
}

// PUT: Update user settings
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const response = await apiRequest('/settings', 'PUT', body);
    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error, 'Failed to update settings');
  }
} 