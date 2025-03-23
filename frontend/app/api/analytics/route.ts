import { NextResponse } from 'next/server';
import { apiRequest, handleApiError } from '@/lib/api-utils';
import { getAuthSession } from '@/lib/auth-utils';

// GET: Fetch analytics data
export async function GET() {
  try {
    // Get authentication session
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Forward request to backend API
    const response = await apiRequest('/analytics');
    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch analytics');
  }
}

// POST: Request a new analytics computation
export async function POST() {
  try {
    // Get authentication session
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Forward request to backend API
    const response = await apiRequest('/analytics', 'POST');
    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error, 'Failed to request analytics');
  }
} 