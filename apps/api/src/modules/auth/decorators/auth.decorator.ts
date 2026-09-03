// Decorador compuesto: @Auth() = cualquier autenticado; @Auth(admin, super_user)
// = ademas valida rol. Se puede aplicar a nivel de clase y sobreescribir por metodo.
import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import { RoleProtected } from './role-protected.decorator';
import { UserRoleGuard } from '../guards/user-role.guard';

export function Auth(...roles: UserRoles[]) {
  return applyDecorators(ApiBearerAuth(), RoleProtected(...roles), UseGuards(AuthGuard('jwt'), UserRoleGuard));
}
