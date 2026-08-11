export type UserStatus = 'ACTIVE' | 'DISABLED' | 'BLOCKED';

export class User {
  private constructor(
    readonly id: string,
    readonly email: string,
    readonly passwordHash: string,
    readonly name: string,
    readonly status: UserStatus,
  ) {}

  static rehydrate(props: {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    status: UserStatus;
  }): User {
    return new User(
      props.id,
      props.email.toLowerCase(),
      props.passwordHash,
      props.name,
      props.status,
    );
  }

  get isActive(): boolean {
    return this.status === 'ACTIVE';
  }

  get isDisabledOrBlocked(): boolean {
    return this.status === 'DISABLED' || this.status === 'BLOCKED';
  }
}
