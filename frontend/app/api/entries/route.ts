import { NextResponse } from 'next/server';
import { apiRequest, handleApiError } from '@/lib/api-utils';

// GET: Fetch all entries
export async function GET() {
  try {
    const response = await apiRequest('/entries');
    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch entries');
  }
}

// POST: Create a new entry
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await apiRequest('/entries', 'POST', body);
    return NextResponse.json(response.data, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to create entry');
  }
} 