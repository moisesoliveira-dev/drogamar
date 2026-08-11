export class AuthServiceUnavailableError extends Error {
  readonly code = 'AUTH_SERVICE_UNAVAILABLE' as const

  constructor(message = 'AUTH_SERVICE_UNAVAILABLE') {
    super(message)
    this.name = 'AuthServiceUnavailableError'
  }
}

export class InvalidCredentialsError extends Error {
  readonly code = 'INVALID_CREDENTIALS' as const

  constructor(message = 'INVALID_CREDENTIALS') {
    super(message)
    this.name = 'InvalidCredentialsError'
  }
}

export class AuthNetworkError extends Error {
  readonly code = 'AUTH_NETWORK' as const

  constructor(message = 'AUTH_NETWORK') {
    super(message)
    this.name = 'AuthNetworkError'
  }
}
