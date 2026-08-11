import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports/user.repository';

@Injectable()
export class GetCurrentUserHandler {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async execute(userId: string) {
    const user = await this.users.findById(userId);
    if (!user || !user.isActive) {
      return null;
    }
    return { id: user.id, email: user.email, name: user.name };
  }
}
