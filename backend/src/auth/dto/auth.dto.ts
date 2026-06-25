import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Boutique Mobile Sfax', description: 'Nom de la boutique' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  shopName: string;

  @ApiProperty({ example: 'admin@maboutique.tn' })
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @ApiProperty({
    example: 'Admin@2026!',
    description: 'Min 8 caractères, 1 majuscule, 1 chiffre, 1 caractère spécial',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/, {
    message: 'Le mot de passe doit contenir au moins 1 majuscule, 1 chiffre et 1 caractère spécial',
  })
  password: string;

  @ApiPropertyOptional({ example: '+216 22 000 000' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'admin@demo.tn' })
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @ApiProperty({ example: 'Admin@2026!' })
  @IsString()
  @MinLength(1)
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token JWT' })
  @IsString()
  refreshToken: string;
}

export class LogoutDto {
  @ApiProperty({ description: 'Refresh token à révoquer' })
  @IsString()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'admin@maboutique.tn' })
  @IsEmail({}, { message: 'Email invalide' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'token_generated_by_system' })
  @IsString()
  token: string;

  @ApiProperty({
    example: 'NewAdmin@2026!',
    description: 'Min 8 caractères, 1 majuscule, 1 chiffre, 1 caractère spécial',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/, {
    message: 'Le mot de passe doit contenir au moins 1 majuscule, 1 chiffre et 1 caractère spécial',
  })
  password: string;
}
