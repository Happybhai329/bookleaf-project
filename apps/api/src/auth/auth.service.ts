import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../data/repositories/user.repository';
import type { AuthUser, User } from '@bookleaf/shared';

@Injectable()
export class AuthService {
  constructor(private readonly userRepo: UserRepository) {}

  async validateUser(email: string, password: string): Promise<AuthUser> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.toAuthUser(user);
  }

  async getUserById(id: string): Promise<AuthUser | null> {
    const user = await this.userRepo.findById(id);
    if (!user) return null;
    return this.toAuthUser(user);
  }

  private toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      author_id: user.author_id,
      display_name: user.display_name,
    };
  }
}
