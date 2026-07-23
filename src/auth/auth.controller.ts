import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Request,
  BadRequestException,
  HttpCode,
  Get,
  Patch,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { UpdateEmpresaProfileDto } from './dto/update-empresa-profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

import { ConsultarNitDto } from './dto/consultar-nit.dto';
import { ValidarRutDto } from './dto/validar-rut.dto';
import { EnviarCodigoDto } from './dto/enviar-codigo.dto';
import { VerificarCodigoDto } from './dto/verificar-codigo.dto';
import { CrearCuentaEmpresaDto } from './dto/crear-cuenta-empresa.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('Autenticación Empresarial')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('empresas/consultar-nit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Consulta empresa en RUES y DIAN por NIT' })
  consultarNit(@Body() dto: ConsultarNitDto) {
    return this.authService.consultarNit(dto);
  }

  @Post('rut/validar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Valida RUT PDF, lo sube a Firebase y extrae correo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['nit', 'rut'],
      properties: {
        nit: { type: 'string', example: '900123456' },
        rut: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('rut', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(new BadRequestException('Solo se aceptan archivos PDF'), false);
        }
        cb(null, true);
      },
    }),
  )
  validarRut(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ValidarRutDto,
  ) {
    if (!file) throw new BadRequestException('El archivo RUT es requerido');
    return this.authService.validarRut(file, dto);
  }

  @Post('enviar-codigo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Genera y envía OTP de 6 dígitos al correo de la empresa' })
  enviarCodigo(@Body() dto: EnviarCodigoDto) {
    return this.authService.enviarCodigo(dto);
  }

  @Post('verificar-codigo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verifica el OTP ingresado por el usuario' })
  verificarCodigo(@Body() dto: VerificarCodigoDto) {
    return this.authService.verificarCodigo(dto);
  }

  @Post('crear-cuenta-empresa')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea la cuenta empresarial con contraseña' })
  crearCuentaEmpresa(@Body() dto: CrearCuentaEmpresaDto) {
    return this.authService.crearCuentaEmpresa(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inicia sesión con NIT o correo + contraseña' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('google/url')
  @ApiOperation({ summary: 'Devuelve la URL para iniciar OAuth con Google' })
  getGoogleUrl() {
    return { url: '/api/auth/google' };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Inicia el flujo OAuth con Google' })
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Callback de Google — genera JWT y redirige al frontend' })
  async googleCallback(@Request() req, @Res() res: Response) {
    const token = await this.authService.loginConGoogle(req.user);
    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }

  @UseGuards(JwtAuthGuard)
  @Post('perfil')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Devuelve datos del usuario autenticado' })
  perfil(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('empresa/perfil')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtiene el perfil de la empresa autenticada' })
  getEmpresaPerfil(@Request() req) {
    return this.authService.getEmpresaPerfil(req.user.nit);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('empresa/perfil')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualiza el perfil de la empresa autenticada' })
  updateEmpresaPerfil(@Request() req, @Body() dto: UpdateEmpresaProfileDto) {
    return this.authService.updateEmpresaPerfil(req.user.nit, dto);
  }
}