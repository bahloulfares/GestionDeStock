import { IsString, IsOptional, IsEmail, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Fournisseur Alpha' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ example: '+216 71 000 000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'contact@alpha.tn' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Tunis' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '30 jours' })
  @IsOptional()
  @IsString()
  paymentTerms?: string;
}

export class UpdateSupplierDto {
  @ApiPropertyOptional({ example: 'Fournisseur Alpha' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ example: '+216 71 000 000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'contact@alpha.tn' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Tunis' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '30 jours' })
  @IsOptional()
  @IsString()
  paymentTerms?: string;
}
