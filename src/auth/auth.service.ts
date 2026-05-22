import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { UpdateEmpresaProfileDto } from './dto/update-empresa-profile.dto';
import { DianService } from './services/dian.service';
import { MailService } from './services/mail.service';

import { EmpresaEntity } from './entities/empresa.entity';
import { CuentaEmpresaEntity } from './entities/cuenta-empresa.entity';
import { OtpEntity } from './entities/otp.entity';

import { ConsultarNitDto } from './dto/consultar-nit.dto';
import { ValidarRutDto } from './dto/validar-rut.dto';
import { EnviarCodigoDto } from './dto/enviar-codigo.dto';
import { VerificarCodigoDto } from './dto/verificar-codigo.dto';
import { CrearCuentaEmpresaDto } from './dto/crear-cuenta-empresa.dto';
import { LoginDto } from './dto/login.dto';
import { EmpresaProfileEntity } from './entities/empresa-profile.entity';
import {
  validarArchivoPdf,
  extraerTextoPdf,
  validarEstructuraRUT,
  extraerCamposRut,
  compararRazonSocial,
  enmascararCorreo,
  leerQr,
  validarQrDian,
  RECHAZAR_SIN_QR,
} from './helpers/rut.helpers';

const OTP_TTL_MINUTES = 10;
const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(EmpresaEntity)
    private readonly empresaRepo: Repository<EmpresaEntity>,
@InjectRepository(EmpresaProfileEntity)
private readonly profileRepo: Repository<EmpresaProfileEntity>,
    @InjectRepository(CuentaEmpresaEntity)
    private readonly cuentaRepo: Repository<CuentaEmpresaEntity>,

    @InjectRepository(OtpEntity)
    private readonly otpRepo: Repository<OtpEntity>,

    private readonly dianService: DianService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // PASO 1 — Consultar empresa por NIT
  // ─────────────────────────────────────────────────────────────────────────────
  async consultarNit(dto: ConsultarNitDto) {
    const nit = dto.nit.trim().replace(/\D/g, '');

    if (nit.length < 6) {
      throw new BadRequestException('El NIT debe tener al menos 6 dígitos.');
    }

    const cuentaExistente = await this.cuentaRepo.findOne({
      where: { empresa: { nit } },
      relations: ['empresa'],
    });
    if (cuentaExistente) {
      throw new ConflictException(
        'Ya existe una cuenta registrada para este NIT. Por favor inicia sesión.',
      );
    }

    const datosEmpresa = await this.dianService.consultarPorNit(nit);

    let empresa = await this.empresaRepo.findOne({ where: { nit } });
    if (!empresa) {
      empresa = this.empresaRepo.create({ nit });
    }

    Object.assign(empresa, {
      dv:                           datosEmpresa.dv,
      razonSocial:                  datosEmpresa.razonSocial,
      estado:                       datosEmpresa.estado,
      actividadEconomicaPrincipal:  datosEmpresa.actividadEconomicaPrincipal,
      actividadEconomicaSecundaria: datosEmpresa.actividadEconomicaSecundaria ?? null,
      tipoContribuyente:            datosEmpresa.tipoContribuyente,
      direccion:                    datosEmpresa.direccion ?? null,
      telefono:                     datosEmpresa.telefono ?? null,
    });

    await this.empresaRepo.save(empresa);

    return {
      ok: true,
      empresa: {
        nit:                          empresa.nit,
        dv:                           empresa.dv,
        razonSocial:                  empresa.razonSocial,
        estado:                       empresa.estado,
        actividadEconomicaPrincipal:  empresa.actividadEconomicaPrincipal,
        actividadEconomicaSecundaria: empresa.actividadEconomicaSecundaria,
        tipoContribuyente:            empresa.tipoContribuyente,
        direccion:                    empresa.direccion,
        telefono:                     empresa.telefono,
        matricula:                    datosEmpresa.matricula ?? null,
        camara:                       datosEmpresa.camara ?? null,
        representanteLegal:           datosEmpresa.representanteLegal ?? null,
        fechaMatricula:               datosEmpresa.fechaMatricula ?? null,
        fechaRenovacion:              datosEmpresa.fechaRenovacion ?? null,
        ultimoAnoRenovado:            datosEmpresa.ultimoAnoRenovado ?? null,
        tipoSociedad:                 datosEmpresa.tipoSociedad ?? null,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PASO 2 — Validar RUT (sin Firebase por ahora)
  // ─────────────────────────────────────────────────────────────────────────────
  async validarRut(file: Express.Multer.File, dto: ValidarRutDto) {
    const nit = dto.nit.trim().replace(/\D/g, '');

    // ── 1. Validación básica del archivo ──────────────────────────────────────
try {
  validarArchivoPdf(file);
} catch (e: unknown) {
  const mensaje = e instanceof Error ? e.message : 'Archivo PDF inválido';
  throw new BadRequestException(mensaje);
}

    // ── 2. Verificar que la empresa exista en BD ──────────────────────────────
    const empresa = await this.empresaRepo.findOne({ where: { nit } });
    if (!empresa) {
      throw new NotFoundException(
        'Empresa no encontrada. Consulta el NIT primero.',
      );
    }

    // ── 3. Extraer texto del PDF ──────────────────────────────────────────────
    let textoPdf: string;
    try {
  textoPdf = await extraerTextoPdf(file.buffer);
} catch (e: unknown) {
  this.logger.error('Error al procesar PDF', e);
  throw new InternalServerErrorException(
    'No se pudo procesar el contenido del PDF. Intenta con un archivo diferente.',
  );
}

    // ── 4. Validar estructura del RUT DIAN ────────────────────────────────────
    const estructuraRUT = validarEstructuraRUT(textoPdf);
    if (!estructuraRUT) {
      throw new BadRequestException(
        'El archivo no parece ser un RUT oficial de la DIAN. ' +
        'Verifica que sea el formulario 001 del Registro Único Tributario.',
      );
    }

    // ── 5. Extraer campos del formulario ──────────────────────────────────────
    const extraido = extraerCamposRut(textoPdf);

    if (!extraido.nit) {
      throw new BadRequestException(
        'No se pudo extraer el NIT del PDF. ' +
        'Verifica que el documento sea legible y no esté protegido.',
      );
    }

    // ── 6. NIT debe coincidir exactamente ─────────────────────────────────────
    const nitCoincide = extraido.nit === nit;
    if (!nitCoincide) {
      throw new BadRequestException({
        ok: false,
        motivo: 'El NIT del RUT no corresponde a la empresa consultada.',
        detalle: {
          nitEsperado: nit,
          nitExtraido: extraido.nit,
          razonSocialEsperada: empresa.razonSocial,
          razonSocialExtraida: extraido.razonSocial,
        },
      });
    }

    // ── 7. Razón social debe coincidir (flexible) ─────────────────────────────
    const razonSocialCoincide = compararRazonSocial(
      empresa.razonSocial,
      extraido.razonSocial,
    );
    if (!razonSocialCoincide) {
      throw new BadRequestException({
        ok: false,
        motivo: 'La razón social del RUT no coincide con la empresa consultada.',
        detalle: {
          nitEsperado: nit,
          nitExtraido: extraido.nit,
          razonSocialEsperada: empresa.razonSocial,
          razonSocialExtraida: extraido.razonSocial,
        },
      });
    }

    // ── 8. Correo debe estar presente en el RUT ───────────────────────────────
    if (!extraido.correo) {
      throw new BadRequestException(
        'No se encontró correo electrónico en el RUT. ' +
        'Asegúrate de cargar el RUT actualizado con buzón electrónico registrado.',
      );
    }

    // ── 9. Validar QR (no bloqueante si está en imagen — advertencia en log) ──
    let qrPresente = false;
    let qrValido = false;

    try {
      const qrContenido = await leerQr(file.buffer);
      qrPresente = !!qrContenido;
      qrValido = qrPresente ? validarQrDian(qrContenido) : false;
    } catch {
      qrPresente = false;
      qrValido = false;
    }

    // Los RUTs de la DIAN tienen el QR como imagen vectorial (no texto),
    // por lo que pdf-parse no puede leerlo. Solo logueamos advertencia.
    if (!qrPresente) {
      this.logger.warn(
        `[RUT] QR no encontrado en texto del PDF para NIT ${nit}. ` +
        `Puede estar en imagen vectorial (requiere renderizado con pdf2pic+jsQR).`,
      );
    }

    // Si RECHAZAR_SIN_QR = true y queremos ser estrictos, descomenta:
    // if (RECHAZAR_SIN_QR && !qrPresente) {
    //   throw new BadRequestException('El RUT no contiene un código QR válido de la DIAN.');
    // }

    // ── 10. Guardar correo en la empresa (para el paso OTP) ───────────────────
    empresa.correo = extraido.correo;
    empresa.rutValidado = true;
    // empresa.rutUrl = null; // Se asignará cuando se implemente Firebase
    await this.empresaRepo.save(empresa);

    this.logger.log(`[RUT] Validación exitosa para NIT ${nit} — correo: ${extraido.correo}`);

    return {
      ok: true,
      validaciones: {
        pdfValido: true,
        estructuraRUT,
        nitCoincide,
        razonSocialCoincide,
        qrPresente,
        qrValido,
      },
      extraido,
      correoEnmascarado: enmascararCorreo(extraido.correo),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PASO 3a — Generar y enviar OTP
  // ─────────────────────────────────────────────────────────────────────────────
  async enviarCodigo(dto: EnviarCodigoDto) {
    const nit = dto.nit.trim().replace(/\D/g, '');

    const empresa = await this.empresaRepo.findOne({ where: { nit } });
    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada.');
    }
    if (!empresa.rutValidado || !empresa.correo) {
      throw new BadRequestException(
        'El RUT no ha sido validado aún. Completa el paso anterior.',
      );
    }

    // Invalidar OTPs anteriores de este NIT
    await this.otpRepo.update({ nit, usado: false }, { usado: true });

    // Generar OTP de 6 dígitos criptográficamente seguro
    const codigo = randomInt(100000, 999999).toString();
    const codigoHash = await bcrypt.hash(codigo, 10);

    const expiraEn = new Date();
    expiraEn.setMinutes(expiraEn.getMinutes() + OTP_TTL_MINUTES);

    const otp = this.otpRepo.create({ nit, codigoHash, expiraEn, usado: false });
    await this.otpRepo.save(otp);

    // Enviar correo
    try {
      await this.mailService.enviarOtp(empresa.correo, empresa.razonSocial, codigo);
    } catch (err) {
      this.logger.error(`Error enviando OTP a ${empresa.correo}`, err);
      throw new InternalServerErrorException(
        'Error al enviar el correo de verificación. Intenta de nuevo.',
      );
    }

    return {
      ok: true,
      mensaje: `Código enviado a ${this.enmascararEmail(empresa.correo)}`,
      expiraEn: expiraEn.toISOString(),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PASO 3b — Verificar OTP
  // ─────────────────────────────────────────────────────────────────────────────
  async verificarCodigo(dto: VerificarCodigoDto) {
    const nit = dto.nit.trim().replace(/\D/g, '');
    const codigo = dto.codigo.trim();

    if (codigo.length !== 6 || !/^\d{6}$/.test(codigo)) {
      throw new BadRequestException('El código debe ser de 6 dígitos numéricos.');
    }

    const otp = await this.otpRepo.findOne({
      where: {
        nit,
        usado: false,
        expiraEn: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    if (!otp) {
      throw new BadRequestException(
        'El código ha expirado o ya fue utilizado. Solicita uno nuevo.',
      );
    }

    const valido = await bcrypt.compare(codigo, otp.codigoHash);
    if (!valido) {
      throw new BadRequestException('Código incorrecto. Inténtalo de nuevo.');
    }

    otp.usado = true;
    await this.otpRepo.save(otp);

    await this.empresaRepo.update({ nit }, { correoVerificado: true });

    return { ok: true, mensaje: 'Correo verificado correctamente.' };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PASO 4 — Crear cuenta empresarial
  // ─────────────────────────────────────────────────────────────────────────────
  async crearCuentaEmpresa(dto: CrearCuentaEmpresaDto) {
    const nit = dto.nit.trim().replace(/\D/g, '');

    const empresa = await this.empresaRepo.findOne({ where: { nit } });
    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada.');
    }
    if (!empresa.correoVerificado) {
      throw new BadRequestException(
        'El correo corporativo no ha sido verificado. Completa el paso anterior.',
      );
    }

    const existe = await this.cuentaRepo.findOne({
      where: { empresa: { nit } },
      relations: ['empresa'],
    });
    if (existe) {
      throw new ConflictException('Ya existe una cuenta para este NIT.');
    }

    this.validarFortalezaPassword(dto.password);

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const cuenta = this.cuentaRepo.create({
      empresa,
      passwordHash,
      activo: true,
    });
    await this.cuentaRepo.save(cuenta);

    try {
      await this.mailService.enviarBienvenida(empresa.correo, empresa.razonSocial);
    } catch (err) {
      this.logger.warn('No se pudo enviar correo de bienvenida', err);
    }

    return {
      ok: true,
      mensaje: 'Cuenta empresarial creada exitosamente.',
      empresa: {
        nit: empresa.nit,
        dv: empresa.dv,
        razonSocial: empresa.razonSocial,
        correo: this.enmascararEmail(empresa.correo),
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────────────────────────────────────
  async login(dto: LoginDto) {
  const identificador = dto.identificador.trim();

  let empresa: EmpresaEntity | null = null;

  if (/^\d+$/.test(identificador)) {
    empresa = await this.empresaRepo.findOne({ where: { nit: identificador } });
  } else {
    empresa = await this.empresaRepo.findOne({
      where: { correo: identificador.toLowerCase() },
    });
  }

  console.log('1. empresa:', empresa?.nit, empresa?.id) // ← log

  if (!empresa) {
    throw new UnauthorizedException('NIT/correo o contraseña incorrectos.');
  }

  const cuenta = await this.cuentaRepo.findOne({
    where: { empresa: { id: empresa.id }, activo: true },
    relations: ['empresa'],
  });

  console.log('2. cuenta:', cuenta?.id, 'activo:', cuenta?.activo) // ← log

  if (!cuenta) {
    throw new UnauthorizedException('NIT/correo o contraseña incorrectos.');
  }

  const passwordValida = await bcrypt.compare(dto.password, cuenta.passwordHash);
  console.log('3. passwordValida:', passwordValida) // ← log

  if (!passwordValida) {
    throw new UnauthorizedException('NIT/correo o contraseña incorrectos.');
  }
  // ...
}
  // ─────────────────────────────────────────────────────────────────────────────
  // HELPERS PRIVADOS
  // ─────────────────────────────────────────────────────────────────────────────
  private enmascararEmail(email: string | null): string {
    if (!email) return '—';
    const [user, domain] = email.split('@');
    return `${user.slice(0, 2)}*****@${domain}`;
  }

  private validarFortalezaPassword(password: string): void {
    if (password.length < 8) {
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres.');
    }
    if (!/[a-zA-Z]/.test(password)) {
      throw new BadRequestException('La contraseña debe contener al menos una letra.');
    }
    if (!/\d/.test(password)) {
      throw new BadRequestException('La contraseña debe contener al menos un número.');
    }
  }

  async getEmpresaPerfil(nit: string) {
  const empresa = await this.empresaRepo.findOne({
    where: { nit },
    relations: ['profile'],
  });
  if (!empresa) throw new NotFoundException('Empresa no encontrada');
  return { empresa, profile: empresa.profile ?? null };
}

async updateEmpresaPerfil(nit: string, dto: UpdateEmpresaProfileDto) {
  const empresa = await this.empresaRepo.findOne({
    where: { nit },
    relations: ['profile'],
  });
  if (!empresa) throw new NotFoundException('Empresa no encontrada');

  if (empresa.profile) {
    await this.profileRepo.update(empresa.profile.id, dto);
  } else {
    const profile = this.profileRepo.create({ empresaId: empresa.id, ...dto });
    await this.profileRepo.save(profile);
  }

  return this.getEmpresaPerfil(nit);
}
}