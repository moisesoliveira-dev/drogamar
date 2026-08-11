export class LoginCommand {
  constructor(
    readonly email: string,
    readonly password: string,
    readonly rememberMe: boolean,
  ) {}
}
