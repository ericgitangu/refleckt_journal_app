import { NextResponse } from 'next/server';
import { apiRequest, handleApiError } from '@/lib/api-utils';

interface Params {
  id: string;
}

// PUT: Update a category
export async function PUT(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const body = await request.json();
    const response = await apiRequest(`/settings/categories/${params.id}`, 'PUT', body);
    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error, `Failed to update category ${params.id}`);
  }
}

// DELETE: Delete a category
export async function DELETE(
  request: Request,
  { params }: { params: Params }
) {
  try {
    await apiRequest(`/settings/categories/${params.id}`, 'DELETE');
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, `Failed to delete category ${params.id}`);
  }
} 