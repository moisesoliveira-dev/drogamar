export class InvalidCredentialsError extends Error {
  readonly code = 'INVALID_CREDENTIALS' as const

  constructor(message = 'INVALID_CREDENTIALS') {
    super(message)
    this.name = 'InvalidCredentialsError'
  }
}

export class AccountUnavailableError extends Error {
  readonly code = 'ACCOUNT_UNAVAILABLE' as const

  constructor(message = 'ACCOUNT_UNAVAILABLE') {
    super(message)
    this.name = 'AccountUnavailableError'
  }
}

export class AuthNetworkError extends Error {
  readonly code = 'AUTH_NETWORK' as const

  constructor(message = 'AUTH_NETWORK') {
    super(message)
    this.name = 'AuthNetworkError'
  }
}

export class AuthServiceUnavailableError extends Error {
  readonly code = 'AUTH_SERVICE_UNAVAILABLE' as const

  constructor(message = 'AUTH_SERVICE_UNAVAILABLE') {
    super(message)
    this.name = 'AuthServiceUnavailableError'
  }
}

export class AuthRateLimitedError extends Error {
  readonly code = 'AUTH_RATE_LIMITED' as const

  constructor(message = 'AUTH_RATE_LIMITED') {
    super(message)
    this.name = 'AuthRateLimitedError'
  }
}

export class AuthValidationError extends Error {
  readonly code = 'AUTH_VALIDATION' as const

  constructor(message = 'AUTH_VALIDATION') {
    super(message)
    this.name = 'AuthValidationError'
  }
}

export class SessionExpiredError extends Error {
  readonly code = 'SESSION_EXPIRED' as const

  constructor(message = 'SESSION_EXPIRED') {
    super(message)
    this.name = 'SessionExpiredError'
  }
}
