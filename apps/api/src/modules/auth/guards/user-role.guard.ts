import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User, UserRoles } from '@prisma/client';
import { AuthErrors } from '../../../common/errors/auth.errors';
import { ROLES_KEY } from '../decorators/role-protected.decorator';

@Injectable()
export class UserRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<UserRoles[]>(ROLES_KEY, context.getHandler());
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as User;
    if (!requiredRoles.includes(user.role)) {
      throw AuthErrors.Exceptions.INSUFFICIENT_ROLE({ required: requiredRoles, actual: user.role });
    }
    return true;
  }
}
