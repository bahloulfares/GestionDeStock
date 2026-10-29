import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto, LogoutDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('setup')
  @ApiOperation({ summary: 'Configuration initiale — Premier démarrage de l\'application' })
  @ApiResponse({ status: 201, description: 'Application configurée avec succès' })
  setup(@Body() dto: RegisterDto) {
    return this.authService.setup(dto);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Inscription d\'une nouvelle boutique (Essai 14 jours gratuit)' })
  @ApiResponse({ status: 201, description: 'Boutique créée avec succès' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mot de passe oublié — Envoi de l\'email de réinitialisation' })
  @ApiResponse({ status: 200, description: 'Email de réinitialisation envoyé si le compte existe' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Réinitialisation du mot de passe avec le token' })
  @ApiResponse({ status: 200, description: 'Mot de passe modifié avec succès' })
  @ApiResponse({ status: 400, description: 'Token invalide ou expiré' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Connexion — Authentification et génération des tokens' })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Identifiants incorrects' })
  @ApiResponse({ status: 429, description: 'Trop de tentatives — réessayez dans 1 minute' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renouvellement du token d\'accès' })
  @ApiResponse({ status: 200, description: 'Nouveau token généré' })
  @ApiResponse({ status: 401, description: 'Refresh token invalide ou expiré' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Déconnexion — Révocation du refresh token' })
  @ApiResponse({ status: 200, description: 'Déconnexion réussie' })
  logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto.refreshToken);
  }
}
