import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  empresaId: string;  // ← agregar
  nit: string;
  razonSocial: string;
  correo: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Este objeto queda disponible como `req.user` en los controladores
   * protegidos con @UseGuards(JwtAuthGuard).
   */
validate(payload: JwtPayload) {
  return {
    cuentaId: payload.sub,
    empresaId: payload.empresaId,  
    nit: payload.nit,
    razonSocial: payload.razonSocial,
    correo: payload.correo,
  };
}
}
