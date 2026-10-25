import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UserRepository } from '../data/repositories/user.repository';
import { AuthorRepository } from '../data/repositories/author.repository';
import type { AuthUser, User, Author } from '@bookleaf/shared';
import { UserRole } from '@bookleaf/shared';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly authorRepo: AuthorRepository,
  ) {}

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

  async register(dto: RegisterDto): Promise<AuthUser> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    // Generate unique author ID
    const count = await this.authorRepo.count();
    const authorId = `AUTH${String(count + 1).padStart(3, '0')}`;

    // Create author profile
    const author: Author = {
      author_id: authorId,
      name: dto.name.trim(),
      email: dto.email.toLowerCase().trim(),
      phone: dto.phone?.trim() || '+91 98000 00000',
      city: dto.city?.trim() || 'India',
      joined_date: new Date().toISOString().slice(0, 10),
    };
    await this.authorRepo.create(author);

    // Create user login record
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user: User = {
      id: uuidv4(),
      email: dto.email.toLowerCase().trim(),
      password_hash: passwordHash,
      role: UserRole.AUTHOR,
      author_id: authorId,
      display_name: dto.name.trim(),
      created_at: new Date().toISOString(),
    };
    await this.userRepo.create(user);

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
