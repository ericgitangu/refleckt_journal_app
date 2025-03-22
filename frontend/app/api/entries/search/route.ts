import { NextResponse } from 'next/server';
import { apiRequest, handleApiError } from '@/lib/api-utils';

// GET: Search for entries
export async function GET(request: Request) {
  try {
    // Get query params
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    
    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const response = await apiRequest(`/entries/search?q=${encodeURIComponent(query)}`);
    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error, 'Failed to search entries');
  }
} 