export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ErrorResponse {
  status: number;
  body: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function toErrorResponse(error: unknown): ErrorResponse {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      body: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    };
  }

  return {
    status: 500,
    body: {
      code: 'internal_error',
      message: 'An unexpected server error occurred.',
    },
  };
}
