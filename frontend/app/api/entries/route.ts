import { NextResponse } from 'next/server';
import { apiRequest, handleApiError } from '@/lib/api-utils';
import { getAuthSession } from '@/lib/auth-utils';

// GET: Fetch all entries
export async function GET() {
  try {
    // Get authentication session
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Forward request to backend API
    const response = await apiRequest('/entries');
    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch entries');
  }
}

// POST: Create a new entry
export async function POST(request: Request) {
  try {
    // Get authentication session
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.title || !body.content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }
    
    // Forward request to backend API
    const response = await apiRequest('/entries', 'POST', body);
    
    // Return created entry with 201 status
    return NextResponse.json(response.data, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to create entry');
  }
} 