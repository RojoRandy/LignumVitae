// Relee el usuario en CADA request (no confia solo en el payload del JWT)
// para que una baja de usuario surta efecto de inmediato, sin esperar a que
// expire el token.
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthErrors } from '../../../common/errors/auth.errors';
import { UserRepository } from '../repositories/user.repository';

interface JwtPayload {
  sub: number;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly userRepository: UserRepository,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userRepository.findActiveById(payload.sub);
    if (!user) throw AuthErrors.Exceptions.USER_NOT_FOUND();
    return user;
  }
}
