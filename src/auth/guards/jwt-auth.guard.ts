import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard
 * Protege rutas que requieren un JWT válido en el header Authorization.
 *
 * Uso:
 *   @UseGuards(JwtAuthGuard)
 *   @Get('ruta-protegida')
 *   miRuta(@Request() req) { return req.user; }
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
