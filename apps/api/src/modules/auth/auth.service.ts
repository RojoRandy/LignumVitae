import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { UserRepository } from './repositories/user.repository';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { buildPaginatedResult, paginate } from '../../common/dto/pagination.dto';
import { AuthErrors } from '../../common/errors/auth.errors';
import { UpdateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 20, search, onlyActive = true } = query;
    const where = {
      ...(onlyActive ? { isActive: true } : {}),
      ...(search
        ? { OR: [{ username: { contains: search, mode: 'insensitive' as const } }, { fullName: { contains: search, mode: 'insensitive' as const } }] }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.userRepository.findMany({ where, orderBy: { fullName: 'asc' }, ...paginate(page, limit) }),
      this.userRepository.count(where),
    ]);

    return buildPaginatedResult(
      items.map((u) => this.toSafeUser(u)),
      total,
      page,
      limit,
    );
  }

  async update(id: number, dto: UpdateUserDto): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findById(id);
    if (!user) throw AuthErrors.Exceptions.USER_NOT_FOUND({ id });

    const data: Record<string, unknown> = {};
    if (dto.username) data.username = dto.username;
    if (dto.fullName) data.fullName = dto.fullName;
    if (dto.role) data.role = dto.role;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);

    const updated = await this.userRepository.update(id, data);
    return this.toSafeUser(updated);
  }

  async deactivate(id: number): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findById(id);
    if (!user) throw AuthErrors.Exceptions.USER_NOT_FOUND({ id });
    const updated = await this.userRepository.deactivate(id);
    return this.toSafeUser(updated);
  }

  async checkStatus(user: User): Promise<Omit<User, 'password'>> {
    return this.toSafeUser(user);
  }

  private toSafeUser(user: User): Omit<User, 'password'> {
    const { password: _password, ...safe } = user;
    return safe;
  }
}
