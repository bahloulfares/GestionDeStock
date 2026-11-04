import { IsBoolean, IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class UpdateUserDto {
  @ApiPropertyOptional({ enum: [UserRole.ADMIN, UserRole.EMPLOYEE] })
  @IsOptional()
  @IsIn([UserRole.ADMIN, UserRole.EMPLOYEE], {
    message: 'Le rôle doit être ADMIN ou EMPLOYEE',
  })
  role?: UserRole;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
