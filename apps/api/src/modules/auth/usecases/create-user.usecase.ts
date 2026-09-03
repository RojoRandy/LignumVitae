import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { UseCase } from '../../../common/interfaces/use-case.interface';
import { AuthErrors } from '../../../common/errors/auth.errors';
import { UserRepository } from '../repositories/user.repository';
import { CreateUserDto } from '../dto/create-user.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class CreateUserUseCase implements UseCase<CreateUserDto, User> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(args: CreateUserDto): Promise<User> {
    const existing = await this.userRepository.findByUsername(args.username);
    if (existing) throw AuthErrors.Exceptions.USERNAME_TAKEN({ username: args.username });

    const hashedPassword = await bcrypt.hash(args.password, SALT_ROUNDS);

    return this.userRepository.create({
      username: args.username,
      fullName: args.fullName,
      password: hashedPassword,
      role: args.role,
    });
  }
}
