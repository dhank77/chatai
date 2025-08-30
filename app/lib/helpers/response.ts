// Response helper functions

/**
 * Create a standardized JSON response with CORS headers
 */
export function createJsonResponse(data: any, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...init?.headers,
    },
  });
}

/**
 * Create a simple JSON response without CORS headers
 */
export function createSimpleJsonResponse(data: any, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
}

/**
 * Create an error response with standardized format
 */
export function createErrorResponse(message: string, status: number = 500) {
  return createJsonResponse(
    { error: message },
    { status }
  );
}

/**
 * Create a success response with standardized format
 */
export function createSuccessResponse(data?: any, message?: string) {
  const responseData = {
    success: true,
    ...(message && { message }),
    ...(data && { data })
  };
  return createJsonResponse(responseData);
}

/**
 * Handle preflight OPTIONS request
 */
export function handleOptionsRequest() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

/**
 * Create a redirect response with auth cookie
 */
export function createAuthRedirect(path: string, token: string) {
  const headers = new Headers();
  headers.append(
    'Set-Cookie',
    `auth-token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Strict`
  );
  
  return new Response(null, {
    status: 302,
    headers: {
      ...Object.fromEntries(headers),
      'Location': path
    }
  });
}

/**
 * Create a response with auth cookie
 */
export function createResponseWithAuthCookie(data: any, token: string, init?: ResponseInit) {
  const response = createJsonResponse(data, init);
  
  response.headers.set(
    'Set-Cookie',
    `auth-token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}; Path=/`
  );
  
  return response;
}