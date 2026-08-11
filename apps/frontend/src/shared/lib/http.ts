export class HttpError extends Error {
  readonly status: number
  readonly code?: string

  constructor(status: number, code?: string, message?: string) {
    super(message ?? 'HTTP_ERROR')
    this.name = 'HttpError'
    this.status = status
    this.code = code
  }
}

export class HttpNetworkError extends Error {
  constructor() {
    super('NETWORK_ERROR')
    this.name = 'HttpNetworkError'
  }
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetch(path, {
      ...init,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new HttpNetworkError()
  }
}

export async function readError(response: Response): Promise<HttpError> {
  let code: string | undefined
  let message: string | undefined
  try {
    const body = (await response.json()) as {
      code?: string
      message?: string
    }
    code = body.code
    message = body.message
  } catch {
    // ignore
  }
  return new HttpError(response.status, code, message)
}
