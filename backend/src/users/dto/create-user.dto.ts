import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'employee@shop.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ enum: [UserRole.ADMIN, UserRole.EMPLOYEE], default: UserRole.EMPLOYEE })
  @IsOptional()
  @IsIn([UserRole.ADMIN, UserRole.EMPLOYEE], {
    message: 'Le rôle doit être ADMIN ou EMPLOYEE',
  })
  role?: UserRole;
}
