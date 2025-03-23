import { NextResponse } from 'next/server';
import { apiRequest, handleApiError } from '@/lib/api-utils';
import { getAuthSession } from '@/lib/auth-utils';

interface CategoryParams {
  params: {
    category: string;
  };
}

// GET: Fetch prompts by category
export async function GET(request: Request, { params }: CategoryParams) {
  try {
    // Get authentication session
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate category parameter
    const { category } = params;
    if (!category) {
      return NextResponse.json(
        { error: 'Category parameter is required' },
        { status: 400 }
      );
    }

    // Forward request to backend API
    const response = await apiRequest(`/prompts/category/${encodeURIComponent(category)}`);
    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch prompts by category');
  }
} 