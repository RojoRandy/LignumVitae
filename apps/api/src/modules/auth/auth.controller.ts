import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import { AuthService } from './auth.service';
import { Auth } from './decorators/auth.decorator';
import { AuthUser } from './decorators/auth-user.decorator';
import { SignInDto } from './dto/sign-in.dto';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { SignInUseCase } from './usecases/sign-in.usecase';
import { CreateUserUseCase } from './usecases/create-user.usecase';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly signInUseCase: SignInUseCase,
    private readonly createUserUseCase: CreateUserUseCase,
  ) {}

  @Post('sign-in')
  signIn(@Body() dto: SignInDto) {
    return this.signInUseCase.execute(dto);
  }

  @Auth()
  @Get('check-status')
  checkStatus(@AuthUser() user: any) {
    return this.authService.checkStatus(user);
  }

  // --- CRUD simple de usuarios, solo para super_user y admin.
  @Auth(UserRoles.admin, UserRoles.super_user)
  @Get('users')
  findAll(@Query() query: PaginationQueryDto) {
    return this.authService.findAll(query);
  }

  @Auth(UserRoles.super_user)
  @Post('users')
  create(@Body() dto: CreateUserDto) {
    return this.createUserUseCase.execute(dto);
  }

  @Auth(UserRoles.super_user)
  @Patch('users/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.authService.update(id, dto);
  }

  @Auth(UserRoles.super_user)
  @Delete('users/:id')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.authService.deactivate(id);
  }
}
