import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsInt,
  Min,
  ArrayMinSize,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PurchaseItemDto {
  @ApiProperty({ example: 'uuid-of-product' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  qty: number;

  @ApiProperty({ example: 5.5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceBuy: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({ example: 'uuid-of-supplier' })
  @IsString()
  supplierId: string;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 'FACT-2024-001' })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional({ example: 'Commande urgente' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [PurchaseItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];
}
