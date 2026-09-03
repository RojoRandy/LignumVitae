// @AuthUser() en un parametro de controller regresa req.user (el User que
// dejo JwtStrategy.validate). @AuthUser('id') regresa solo ese campo.
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';

export const AuthUser = createParamDecorator((data: keyof User | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user as User;
  return data ? user?.[data] : user;
});
