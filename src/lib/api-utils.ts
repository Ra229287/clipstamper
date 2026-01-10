import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from './auth';

// Standard API response types
export interface ApiSuccess<T> {
  data: T;
}

export interface ApiError {
  error: {
    message: string;
    code: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Helper to create success response
export function success<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ data }, { status });
}

// Helper to create error response
export function error(message: string, code: string, status = 400): NextResponse<ApiError> {
  return NextResponse.json({ error: { message, code } }, { status });
}

// Common error responses
export const errors = {
  unauthorized: () => error('Unauthorized', 'UNAUTHORIZED', 401),
  notFound: (resource: string) => error(resource + ' not found', 'NOT_FOUND', 404),
  validation: (message: string) => error(message, 'VALIDATION_ERROR', 400),
  internal: () => error('Internal server error', 'INTERNAL_ERROR', 500),
} as const;

// Validate request body with Zod schema
export async function validateBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: NextResponse<ApiError> }> {
  try {
    const body: unknown = await request.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      const issues = result.error.issues.map(i => i.message).join(', ');
      return { success: false, error: errors.validation(issues) };
    }
    
    return { success: true, data: result.data };
  } catch {
    return { success: false, error: errors.validation('Invalid JSON body') };
  }
}

// Get authenticated user from session
export async function getAuthUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  return session.user;
}
