import { NextResponse } from 'next/server';
import { apiRequest, handleApiError } from '@/lib/api-utils';
import { getAuthSession } from '@/lib/auth-utils';

// GET: Fetch all prompts
export async function GET() {
  try {
    // Get authentication session
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Forward request to backend API
    const response = await apiRequest('/prompts');
    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch prompts');
  }
}

// POST: Create a new prompt (admin only)
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
    if (!body.text || !body.category) {
      return NextResponse.json(
        { error: 'Text and category are required' },
        { status: 400 }
      );
    }
    
    // Forward request to backend API
    const response = await apiRequest('/prompts', 'POST', body);
    
    // Return created prompt with 201 status
    return NextResponse.json(response.data, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to create prompt');
  }
} 