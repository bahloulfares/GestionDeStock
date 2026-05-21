import { IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Coques & Protection' })
  @IsString()
  @MinLength(1)
  name: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Coques & Protection' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
}
