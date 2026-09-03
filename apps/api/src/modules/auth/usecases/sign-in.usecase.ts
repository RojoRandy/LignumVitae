import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UseCase } from '../../../common/interfaces/use-case.interface';
import { AuthErrors } from '../../../common/errors/auth.errors';
import { UserRepository } from '../repositories/user.repository';
import { SignInDto, SignInResponseDto } from '../dto/sign-in.dto';

@Injectable()
export class SignInUseCase implements UseCase<SignInDto, SignInResponseDto> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(args: SignInDto): Promise<SignInResponseDto> {
    const user = await this.userRepository.findByUsername(args.username);
    if (!user) throw AuthErrors.Exceptions.INVALID_CREDENTIALS();
    if (!user.isActive) throw AuthErrors.Exceptions.USER_INACTIVE();

    const passwordMatches = await bcrypt.compare(args.password, user.password);
    if (!passwordMatches) throw AuthErrors.Exceptions.INVALID_CREDENTIALS();

    const accessToken = await this.jwtService.signAsync({ sub: user.id, role: user.role });

    return {
      accessToken,
      user: { id: user.id, username: user.username, fullName: user.fullName, role: user.role },
    };
  }
}
