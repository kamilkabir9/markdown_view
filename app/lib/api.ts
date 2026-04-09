import type { Anchor, Annotation } from '~/contexts/AnnotationStore';

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

export interface FileInfo {
  path: string;
  name: string;
  relativePath: string;
  routePath: string;
  size: number;
  modified: string;
}

export interface MarkdownFile {
  content: string;
  path: string;
  sourcePath: string;
  absolutePath: string;
  size: number;
  modified: string;
}

interface ApiRequestOptions extends RequestInit {
  signal?: AbortSignal;
}

interface ApiResponseError extends Error {
  status?: number;
  code?: string;
}

async function requestJson<T>(path: string, init: ApiRequestOptions = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    let errorBody: ApiErrorShape | null = null;

    try {
      errorBody = (await response.json()) as ApiErrorShape;
    } catch {
      errorBody = null;
    }

    const error = new Error(errorBody?.message || 'Request failed.') as ApiResponseError;
    error.status = response.status;
    error.code = errorBody?.code;
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
}

export async function fetchFiles(signal?: AbortSignal): Promise<{ files: FileInfo[]; contentRoot: string }> {
  return requestJson('/api/files', { signal });
}

export async function fetchFile(path: string, signal?: AbortSignal): Promise<MarkdownFile> {
  return requestJson(`/api/files/${encodeURIComponent(path).replace(/%2F/g, '/')}`, { signal });
}

export async function fetchComments(filePath: string, signal?: AbortSignal): Promise<Annotation[]> {
  const params = new URLSearchParams({ file: filePath });
  const response = await requestJson<{ comments: Annotation[] }>(`/api/comments?${params.toString()}`, { signal });
  return response.comments;
}

export async function createComment(filePath: string, annotation: Omit<Annotation, 'id' | 'createdAt'> & Partial<Pick<Annotation, 'id' | 'createdAt'>>): Promise<Annotation> {
  const response = await requestJson<{ comment: Annotation }>('/api/comments', {
    method: 'POST',
    body: JSON.stringify({ filePath, annotation }),
  });

  return response.comment;
}

export async function importComments(filePath: string, annotations: Annotation[]): Promise<Annotation[]> {
  const response = await requestJson<{ comments: Annotation[] }>('/api/comments/import', {
    method: 'POST',
    body: JSON.stringify({ filePath, annotations }),
  });

  return response.comments;
}

export async function updateComment(filePath: string, id: string, text: string): Promise<Annotation> {
  const response = await requestJson<{ comment: Annotation }>(`/api/comments/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ filePath, text }),
  });

  return response.comment;
}

export async function deleteComment(filePath: string, id: string): Promise<void> {
  const params = new URLSearchParams({ file: filePath });
  await requestJson<void>(`/api/comments/${id}?${params.toString()}`, {
    method: 'DELETE',
  });
}

export type { Anchor };
