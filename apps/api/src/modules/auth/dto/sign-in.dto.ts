import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SignInDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'Admin123!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class SignInResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  user: {
    id: number;
    username: string;
    fullName: string;
    role: string;
  };
}
