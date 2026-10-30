import {
  IsString,
  IsEmail,
  IsNumber,
  IsOptional,
  MinLength,
  MaxLength,
  IsBoolean,
  Min,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantByAdminDto {
  @ApiProperty({ example: 'Boutique Phone Plus Tunis' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'contact@phoneplus.tn' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '+216 22 123 456' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'admin@phoneplus.tn' })
  @IsEmail()
  adminEmail: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8)
  adminPassword: string;

  @ApiProperty({ example: 'MONTHLY', enum: ['MONTHLY', 'YEARLY', 'TRIAL', 'LIFETIME'] })
  @IsIn(['MONTHLY', 'YEARLY', 'TRIAL', 'LIFETIME'])
  plan: 'MONTHLY' | 'YEARLY' | 'TRIAL' | 'LIFETIME';

  @ApiProperty({ example: 1, description: 'Durée en mois accordée' })
  @IsNumber()
  @Min(1)
  durationMonths: number;

  @ApiPropertyOptional({ example: 50.0, description: 'Montant encaissé en DT' })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ example: 'CASH', description: 'CASH, D17, TRANSFER, CHEQUE' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}

export class RenewSubscriptionDto {
  @ApiProperty({ example: 1, description: 'Nombre de mois à ajouter (1 pour mois, 12 pour an)' })
  @IsNumber()
  @Min(1)
  durationMonths: number;

  @ApiProperty({ example: 40.0, description: 'Montant encaissé en DT' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'CASH', description: 'Moyen de paiement (CASH, D17, VIREMENT, CHEQUE)' })
  @IsString()
  paymentMethod: string;

  @ApiPropertyOptional({ example: 'Paiement espèces en mains propres' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ToggleBlockTenantDto {
  @ApiProperty({ example: true, description: 'Bloquer (true) ou débloquer (false)' })
  @IsBoolean()
  isBlocked: boolean;

  @ApiPropertyOptional({ example: 'Facture impayée depuis 30 jours' })
  @IsOptional()
  @IsString()
  blockReason?: string;
}

export class ResetUserPasswordDto {
  @ApiProperty({ example: 'NouveauMotDePasse123!', description: 'Nouveau mot de passe (min 8 caracteres)' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
