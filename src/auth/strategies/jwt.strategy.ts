import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  tipo: 'empresa' | 'usuario';

  empresaId?: string;
  nit?: string;
  razonSocial?: string;
  correo?: string;

  email?: string;
  nombre?: string;
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

  validate(payload: JwtPayload) {
    if (payload.tipo === 'usuario') {
      return {
        usuarioId: payload.sub,
        email: payload.email,
        nombre: payload.nombre,
        tipo: 'usuario',
      };
    }

    return {
      cuentaId: payload.sub,
      empresaId: payload.empresaId,
      nit: payload.nit,
      razonSocial: payload.razonSocial,
      correo: payload.correo,
      tipo: 'empresa',
    };
  }
}