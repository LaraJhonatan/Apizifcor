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
import { randomInt, randomBytes, createHash } from 'crypto';
import { UpdateEmpresaProfileDto } from './dto/update-empresa-profile.dto';
import { DianService } from './services/dian.service';
import { MailService } from './services/mail.service';
import { ConfigService } from '@nestjs/config';

import { EmpresaEntity } from './entities/empresa.entity';
import { CuentaEmpresaEntity } from './entities/cuenta-empresa.entity';
import { OtpEntity } from './entities/otp.entity';
import { PasswordResetEntity } from './entities/password-reset.entity';

import { ConsultarNitDto } from './dto/consultar-nit.dto';
import { ValidarRutDto } from './dto/validar-rut.dto';
import { EnviarCodigoDto } from './dto/enviar-codigo.dto';
import { VerificarCodigoDto } from './dto/verificar-codigo.dto';
import { CrearCuentaEmpresaDto } from './dto/crear-cuenta-empresa.dto';
import { LoginDto } from './dto/login.dto';
import { SolicitarResetPasswordDto } from './dto/solicitar-reset-password.dto';
import { RestablecerPasswordDto } from './dto/restablecer-password.dto';
import { EmpresaProfileEntity } from './entities/empresa-profile.entity';
import { UsuarioEntity } from '../users/entities/user.entity';
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
import { slugify, slugifyUnique } from '../common/utils/slugify';

const OTP_TTL_MINUTES = 10;
const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_TTL_MINUTES = 30;

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

    @InjectRepository(UsuarioEntity)
    private readonly usuarioRepo: Repository<UsuarioEntity>,

    @InjectRepository(PasswordResetEntity)
    private readonly passwordResetRepo: Repository<PasswordResetEntity>,

    private readonly dianService: DianService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  private async generarSlugEmpresa(nombre: string, excludeId?: string): Promise<string> {
    return slugifyUnique(nombre, async (slug) => {
      const qb = this.profileRepo.createQueryBuilder('p')
        .where('p.slug = :slug', { slug });
      if (excludeId) qb.andWhere('p.id != :id', { id: excludeId });
      const found = await qb.getOne();
      return !!found;
    });
  }

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

  async validarRut(file: Express.Multer.File, dto: ValidarRutDto) {
    const nit = dto.nit.trim().replace(/\D/g, '');

    try {
      validarArchivoPdf(file);
    } catch (e: unknown) {
      const mensaje = e instanceof Error ? e.message : 'Archivo PDF inválido';
      throw new BadRequestException(mensaje);
    }

    const empresa = await this.empresaRepo.findOne({ where: { nit } });
    if (!empresa) {
      throw new NotFoundException(
        'Empresa no encontrada. Consulta el NIT primero.',
      );
    }

    let textoPdf: string;
    try {
      textoPdf = await extraerTextoPdf(file.buffer);
    } catch (e: unknown) {
      this.logger.error('Error al procesar PDF', e);
      throw new InternalServerErrorException(
        'No se pudo procesar el contenido del PDF. Intenta con un archivo diferente.',
      );
    }

    const estructuraRUT = validarEstructuraRUT(textoPdf);
    if (!estructuraRUT) {
      throw new BadRequestException(
        'El archivo no parece ser un RUT oficial de la DIAN. ' +
        'Verifica que sea el formulario 001 del Registro Único Tributario.',
      );
    }

    const extraido = extraerCamposRut(textoPdf);

    if (!extraido.nit) {
      throw new BadRequestException(
        'No se pudo extraer el NIT del PDF. ' +
        'Verifica que el documento sea legible y no esté protegido.',
      );
    }

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

    if (!extraido.correo) {
      throw new BadRequestException(
        'No se encontró correo electrónico en el RUT. ' +
        'Asegúrate de cargar el RUT actualizado con buzón electrónico registrado.',
      );
    }

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

    if (!qrPresente) {
      this.logger.warn(
        `[RUT] QR no encontrado en texto del PDF para NIT ${nit}. ` +
        `Puede estar en imagen vectorial (requiere renderizado con pdf2pic+jsQR).`,
      );
    }

    empresa.correo = extraido.correo;
    empresa.rutValidado = true;
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

    await this.otpRepo.update({ nit, usado: false }, { usado: true });

    const codigo = randomInt(100000, 999999).toString();
    const codigoHash = await bcrypt.hash(codigo, 10);

    const expiraEn = new Date();
    expiraEn.setMinutes(expiraEn.getMinutes() + OTP_TTL_MINUTES);

    const otp = this.otpRepo.create({ nit, codigoHash, expiraEn, usado: false });
    await this.otpRepo.save(otp);

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

  async login(dto: LoginDto) {
    const identificador = dto.identificador.trim();

    let empresa: EmpresaEntity | null = null;

    if (/^\d+$/.test(identificador)) {
      empresa = await this.empresaRepo.findOne({
        where: { nit: identificador },
        relations: ['profile'],
      });
    } else {
      empresa = await this.empresaRepo.findOne({
        where: { correo: identificador.toLowerCase() },
        relations: ['profile'],
      });
    }

    if (!empresa) {
      throw new UnauthorizedException('NIT/correo o contraseña incorrectos.');
    }

    const cuenta = await this.cuentaRepo.findOne({
      where: { empresa: { id: empresa.id }, activo: true },
      relations: ['empresa'],
    });

    if (!cuenta) {
      throw new UnauthorizedException('NIT/correo o contraseña incorrectos.');
    }

    const passwordValida = await bcrypt.compare(dto.password, cuenta.passwordHash);
    if (!passwordValida) {
      throw new UnauthorizedException('NIT/correo o contraseña incorrectos.');
    }

    const accessToken = this.jwtService.sign({
      sub: cuenta.id,
      tipo: 'empresa',
      empresaId: empresa.id,
      nit: empresa.nit,
      razonSocial: empresa.razonSocial,
      correo: empresa.correo,
    });

    return {
      ok: true,
      accessToken,
      empresa: {
        nit: empresa.nit,
        dv: empresa.dv,
        razonSocial: empresa.razonSocial,
        correo: this.enmascararEmail(empresa.correo),
        estado: empresa.estado,
        logoUrl: empresa.profile?.logoUrl || null,
      },
    };
  }

  private async buscarEmpresaPorIdentificador(identificador: string): Promise<EmpresaEntity | null> {
    if (/^\d+$/.test(identificador)) {
      return this.empresaRepo.findOne({ where: { nit: identificador } });
    }
    return this.empresaRepo.findOne({ where: { correo: identificador.toLowerCase() } });
  }

  async solicitarResetPassword(dto: SolicitarResetPasswordDto) {
    const identificador = dto.identificador.trim();
    const empresa = await this.buscarEmpresaPorIdentificador(identificador);

    if (!empresa || !empresa.correo) {
      throw new NotFoundException('No encontramos una cuenta con ese NIT o correo.');
    }

    const cuenta = await this.cuentaRepo.findOne({
      where: { empresa: { id: empresa.id }, activo: true },
      relations: ['empresa'],
    });
    if (!cuenta) {
      throw new NotFoundException('No encontramos una cuenta con ese NIT o correo.');
    }

    await this.passwordResetRepo.update({ empresaId: empresa.id, usado: false }, { usado: true });

    const tokenPlano = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(tokenPlano).digest('hex');

    const expiraEn = new Date();
    expiraEn.setMinutes(expiraEn.getMinutes() + RESET_TOKEN_TTL_MINUTES);

    const reset = this.passwordResetRepo.create({ empresaId: empresa.id, tokenHash, expiraEn, usado: false });
    await this.passwordResetRepo.save(reset);

    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    const resetLink = `${frontendUrl}/auth/restablecer-password?token=${tokenPlano}`;

    try {
      await this.mailService.enviarRecuperacion(empresa.correo, empresa.razonSocial, resetLink);
    } catch (err) {
      this.logger.error(`Error enviando correo de recuperación a ${empresa.correo}`, err);
      throw new InternalServerErrorException(
        'Error al enviar el correo de recuperación. Intenta de nuevo.',
      );
    }

    return {
      ok: true,
      mensaje: `Enviamos instrucciones a ${this.enmascararEmail(empresa.correo)}`,
    };
  }

  async restablecerPassword(dto: RestablecerPasswordDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');

    const reset = await this.passwordResetRepo.findOne({
      where: {
        tokenHash,
        usado: false,
        expiraEn: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    if (!reset) {
      throw new BadRequestException('El enlace ha expirado o ya fue utilizado. Solicita uno nuevo.');
    }

    this.validarFortalezaPassword(dto.password);

    const cuenta = await this.cuentaRepo.findOne({
      where: { empresa: { id: reset.empresaId } },
      relations: ['empresa'],
    });
    if (!cuenta) {
      throw new NotFoundException('No encontramos la cuenta asociada a este enlace.');
    }

    cuenta.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    await this.cuentaRepo.save(cuenta);

    reset.usado = true;
    await this.passwordResetRepo.save(reset);

    return { ok: true, mensaje: 'Contraseña actualizada correctamente.' };
  }

  async loginConGoogle(googleUser: {
    googleId: string;
    email: string;
    nombreCompleto: string;
    fotoUrl: string | null;
  }): Promise<string> {
    let usuario = await this.usuarioRepo.findOne({
      where: { googleId: googleUser.googleId },
    });

    if (!usuario) {
      usuario = this.usuarioRepo.create({
        googleId: googleUser.googleId,
        email: googleUser.email,
        nombreCompleto: googleUser.nombreCompleto,
        fotoUrl: googleUser.fotoUrl,
      });
    } else {
      if (googleUser.fotoUrl) usuario.fotoUrl = googleUser.fotoUrl;
    }

    await this.usuarioRepo.save(usuario);

return this.jwtService.sign({
  sub: String(usuario.id),
  tipo: 'usuario',
  email: usuario.email,
  nombre: usuario.nombreCompleto,
  fotoUrl: usuario.fotoUrl,
});
  }

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

    const nombreParaSlug = dto.nombreComercial || empresa.profile?.nombreComercial || empresa.razonSocial;
    const slug = await this.generarSlugEmpresa(nombreParaSlug, empresa.profile?.id);

    if (empresa.profile) {
      await this.profileRepo.update(empresa.profile.id, { ...dto, slug });
    } else {
      const profile = this.profileRepo.create({ empresaId: empresa.id, ...dto, slug });
      await this.profileRepo.save(profile);
    }

    return this.getEmpresaPerfil(nit);
  }
}