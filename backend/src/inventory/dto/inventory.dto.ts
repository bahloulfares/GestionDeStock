import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class InventoryItemDto {
  @ApiProperty({ example: 'uuid-of-product' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 47 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  qtyPhysical: number;

  @ApiPropertyOptional({ example: 'Comptage corrigé' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class CreateInventorySessionDto {
  @ApiPropertyOptional({ example: 'Inventaire mensuel janvier' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [InventoryItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InventoryItemDto)
  items: InventoryItemDto[];
}
