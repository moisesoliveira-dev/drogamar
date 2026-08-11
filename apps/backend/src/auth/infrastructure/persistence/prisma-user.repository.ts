import { Injectable } from '@nestjs/common';
import { User } from '../../domain/user';
import type { UserRepository } from '../../domain/ports/user.repository';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    return row ? this.toDomain(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  private toDomain(row: {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    status: 'ACTIVE' | 'DISABLED' | 'BLOCKED';
  }): User {
    return User.rehydrate(row);
  }
}
