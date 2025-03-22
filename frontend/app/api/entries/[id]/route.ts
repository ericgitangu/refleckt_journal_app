import { NextResponse } from 'next/server';
import { apiRequest, handleApiError } from '@/lib/api-utils';

interface Params {
  id: string;
}

// GET: Fetch a specific entry by ID
export async function GET(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const response = await apiRequest(`/entries/${params.id}`);
    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error, `Failed to fetch entry ${params.id}`);
  }
}

// PUT: Update an entry
export async function PUT(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const body = await request.json();
    const response = await apiRequest(`/entries/${params.id}`, 'PUT', body);
    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error, `Failed to update entry ${params.id}`);
  }
}

// DELETE: Delete an entry
export async function DELETE(
  request: Request,
  { params }: { params: Params }
) {
  try {
    await apiRequest(`/entries/${params.id}`, 'DELETE');
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, `Failed to delete entry ${params.id}`);
  }
} 