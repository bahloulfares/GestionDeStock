import { IsString, IsOptional, IsArray, ValidateNested, IsInt, Min, IsBoolean, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ReturnReason } from '@prisma/client';

export class ReturnItemDto {
  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  qty: number;

  @IsEnum(ReturnReason)
  reason: ReturnReason;

  @IsBoolean()
  returnToStock: boolean;
}

export class CreateReturnDto {
  @IsString()
  saleId: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];
}
