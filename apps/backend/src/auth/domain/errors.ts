export class InvalidCredentialsError extends Error {
  readonly code = 'INVALID_CREDENTIALS' as const;

  constructor() {
    super('INVALID_CREDENTIALS');
    this.name = 'InvalidCredentialsError';
  }
}

export class AccountUnavailableError extends Error {
  readonly code = 'ACCOUNT_UNAVAILABLE' as const;

  constructor() {
    super('ACCOUNT_UNAVAILABLE');
    this.name = 'AccountUnavailableError';
  }
}
