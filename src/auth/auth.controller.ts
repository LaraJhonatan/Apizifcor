import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Request,
  BadRequestException,
  HttpCode,Get, Patch,
  HttpStatus,
  
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
  constructor(private readonly authService: AuthService) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // PASO 1 — Consultar empresa por NIT en RUES / DIAN
  // ─────────────────────────────────────────────────────────────────────────────
  @Post('empresas/consultar-nit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Consulta empresa en RUES y DIAN por NIT' })
  consultarNit(@Body() dto: ConsultarNitDto) {
    return this.authService.consultarNit(dto);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PASO 2 — Subir RUT PDF → Firebase Storage → leer correo corporativo
  // ─────────────────────────────────────────────────────────────────────────────
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
      limits: { fileSize: 5 * 1024 * 1024 }, // máx 5 MB
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

  // ─────────────────────────────────────────────────────────────────────────────
  // PASO 3a — Enviar código OTP al correo corporativo
  // ─────────────────────────────────────────────────────────────────────────────
  @Post('enviar-codigo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Genera y envía OTP de 6 dígitos al correo de la empresa' })
  enviarCodigo(@Body() dto: EnviarCodigoDto) {
    return this.authService.enviarCodigo(dto);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PASO 3b — Verificar código OTP
  // ─────────────────────────────────────────────────────────────────────────────
  @Post('verificar-codigo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verifica el OTP ingresado por el usuario' })
  verificarCodigo(@Body() dto: VerificarCodigoDto) {
    return this.authService.verificarCodigo(dto);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PASO 4 — Crear cuenta empresarial
  // ─────────────────────────────────────────────────────────────────────────────
  @Post('crear-cuenta-empresa')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea la cuenta empresarial con contraseña' })
  crearCuentaEmpresa(@Body() dto: CrearCuentaEmpresaDto) {
    return this.authService.crearCuentaEmpresa(dto);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────────────────────────────────────
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inicia sesión con NIT o correo + contraseña' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PERFIL (ruta protegida — ejemplo de uso del guard)
  // ─────────────────────────────────────────────────────────────────────────────
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