import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsInt,
  Min,
  MinLength,
  ArrayMinSize,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class SaleItemDto {
  @ApiProperty({ example: 'uuid-of-product' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  qty: number;

  @ApiProperty({ example: 12.5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceSell: number;
}

export class CreateSaleDto {
  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ example: 'Vente client fidèle' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [SaleItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];
}

export class CancelSaleDto {
  @ApiProperty({ example: 'Retour produit défectueux' })
  @IsString()
  @MinLength(1)
  reason: string;
}
