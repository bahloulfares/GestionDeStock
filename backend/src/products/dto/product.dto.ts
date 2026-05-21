import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
  MinLength,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'Coque iPhone 15' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ example: 'REF-001' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: 'uuid-of-category' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ example: 5.5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceBuy: number;

  @ApiProperty({ example: 12.0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceSell: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  qty?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minStock?: number;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Coque iPhone 15' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ example: 'REF-001' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: 'uuid-of-category' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 5.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceBuy?: number;

  @ApiPropertyOptional({ example: 12.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceSell?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  qty?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minStock?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
