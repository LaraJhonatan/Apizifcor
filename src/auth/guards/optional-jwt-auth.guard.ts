import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Como JwtAuthGuard, pero no exige sesión: si hay un token válido deja `req.user`,
 * y si no hay (o no es válido) sigue con `req.user = null`.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(_err: unknown, user: TUser): TUser {
    return user || null;
  }
}
