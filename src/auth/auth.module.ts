import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DianService } from './services/dian.service';
import { FirebaseStorageService } from './services/firebase-storage.service';
import { MailService } from './services/mail.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

import { EmpresaEntity } from './entities/empresa.entity';
import { CuentaEmpresaEntity } from './entities/cuenta-empresa.entity';
import { OtpEntity } from './entities/otp.entity';
import { EmpresaProfileEntity } from './entities/empresa-profile.entity';
import { UsuarioEntity } from '../users/entities/user.entity';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '7d') },
      }),
    }),
    TypeOrmModule.forFeature([
      EmpresaEntity,
      CuentaEmpresaEntity,
      OtpEntity,
      EmpresaProfileEntity,
      UsuarioEntity,
    ]),
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    DianService,
    FirebaseStorageService,
    MailService,
    JwtStrategy,
    GoogleStrategy,
  ],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}