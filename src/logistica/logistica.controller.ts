import {
  Controller, Get, Post, Put, Patch, Body, Param, UseGuards, Request, Response,
  ForbiddenException, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { LogisticaService, CuentaLogistica } from './logistica.service';
import { ParseGuidPipe } from './guid';
import {
  CotizarDto, ConfirmarCotizacionDto, VerificarPagoDto, ResumenCotizacionesDto, BuscarCotizacionDto,
} from './dto/cotizar.dto';
import {
  CreateVehiculoDto, UpdateVehiculoDto, CreateRutaDto, UpdateRutaDto,
  CreateServicioDto, UpdateServicioDto, GuardarTarifasDto, GuardarImagenesDto,
} from './dto/admin-logistica.dto';

@ApiTags('Logística')
@Controller('logistica')
export class LogisticaController {
  constructor(private readonly svc: LogisticaService) {}

  // ── Público (sin sesión) ──

  @Get('catalogo')
  catalogo() {
    return this.svc.catalogo();
  }

  @Get('imagenes')
  imagenes() {
    return this.svc.imagenes();
  }

  @Post('cotizar')
  @HttpCode(HttpStatus.OK)
  cotizar(@Body() dto: CotizarDto) {
    return this.svc.cotizar(dto);
  }

  /** No exige sesión; si el cliente la tiene, la cotización queda asociada a su cuenta. */
  @Post('cotizaciones')
  @UseGuards(OptionalJwtAuthGuard)
  confirmar(@Request() req: any, @Body() dto: ConfirmarCotizacionDto) {
    return this.svc.confirmar(dto, this.cuenta(req));
  }

  // Las rutas de una cotización no exigen sesión (las hechas sin cuenta se abren con su enlace),
  // pero si la cotización tiene dueño, el servicio exige que la sesión sea la de esa cuenta.

  @Post('cotizaciones/resumen')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  resumen(@Request() req: any, @Body() dto: ResumenCotizacionesDto) {
    return this.svc.resumenPorTokens(dto.tokens, this.cuenta(req));
  }

  @Post('cotizaciones/buscar')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  buscar(@Request() req: any, @Body() dto: BuscarCotizacionDto) {
    return this.svc.buscar(dto.numero, dto.email, this.cuenta(req));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('mis-cotizaciones')
  misCotizaciones(@Request() req: any) {
    return this.svc.misCotizaciones(this.cuenta(req));
  }

  private cuenta(req: any): CuentaLogistica {
    const user = req.user;
    if (user?.tipo === 'empresa' && user.empresaId) return { empresaId: user.empresaId };
    if (user?.tipo === 'usuario' && user.usuarioId) return { usuarioId: Number(user.usuarioId) };
    return {};
  }

  @Get('cotizaciones/:token')
  @UseGuards(OptionalJwtAuthGuard)
  obtener(@Request() req: any, @Param('token', ParseUUIDPipe) token: string) {
    return this.svc.obtenerPorToken(token, this.cuenta(req));
  }

  @Post('cotizaciones/:token/pago')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  iniciarPago(@Request() req: any, @Param('token', ParseUUIDPipe) token: string) {
    return this.svc.iniciarPago(token, this.cuenta(req));
  }

  @Post('cotizaciones/:token/verificar-pago')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  verificarPago(
    @Request() req: any,
    @Param('token', ParseUUIDPipe) token: string,
    @Body() dto: VerificarPagoDto,
  ) {
    return this.svc.verificarPago(token, dto.transactionId, this.cuenta(req));
  }

  @Get('cotizaciones/:token/pdf')
  @UseGuards(OptionalJwtAuthGuard)
  async pdf(
    @Request() req: any,
    @Param('token', ParseUUIDPipe) token: string,
    @Response() res: ExpressResponse,
  ) {
    const { buffer, numero } = await this.svc.pdf(token, this.cuenta(req));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${numero}.pdf"`);
    res.send(buffer);
  }

  // ── Dashboard (empresas autorizadas en logistica_editores) ──

  private getEmpresaId(req: any): string {
    const user = req.user;
    if (!user || user.tipo !== 'empresa' || !user.empresaId) {
      throw new ForbiddenException('Solo disponible para empresas.');
    }
    return user.empresaId;
  }

  private async editor(req: any) {
    await this.svc.assertEditor(this.getEmpresaId(req));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('admin/permiso')
  async permiso(@Request() req: any) {
    const user = req.user;
    const editor = user?.tipo === 'empresa' && user.empresaId ? await this.svc.esEditor(user.empresaId) : false;
    return { editor };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('admin/datos')
  async datos(@Request() req: any) {
    await this.editor(req);
    return this.svc.datosAdmin();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('admin/vehiculos')
  async crearVehiculo(@Request() req: any, @Body() dto: CreateVehiculoDto) {
    await this.editor(req);
    return this.svc.crearVehiculo(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('admin/vehiculos/:id')
  async actualizarVehiculo(@Request() req: any, @Param('id', ParseGuidPipe) id: string, @Body() dto: UpdateVehiculoDto) {
    await this.editor(req);
    return this.svc.actualizarVehiculo(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('admin/rutas')
  async crearRuta(@Request() req: any, @Body() dto: CreateRutaDto) {
    await this.editor(req);
    return this.svc.crearRuta(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('admin/rutas/:id')
  async actualizarRuta(@Request() req: any, @Param('id', ParseGuidPipe) id: string, @Body() dto: UpdateRutaDto) {
    await this.editor(req);
    return this.svc.actualizarRuta(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put('admin/tarifas')
  async guardarTarifas(@Request() req: any, @Body() dto: GuardarTarifasDto) {
    await this.editor(req);
    return this.svc.guardarTarifas(dto.items);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('admin/servicios')
  async crearServicio(@Request() req: any, @Body() dto: CreateServicioDto) {
    await this.editor(req);
    return this.svc.crearServicio(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('admin/servicios/:id')
  async actualizarServicio(@Request() req: any, @Param('id', ParseGuidPipe) id: string, @Body() dto: UpdateServicioDto) {
    await this.editor(req);
    return this.svc.actualizarServicio(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put('admin/imagenes')
  async guardarImagenes(@Request() req: any, @Body() dto: GuardarImagenesDto) {
    await this.editor(req);
    return this.svc.guardarImagenes(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('admin/cotizaciones')
  async cotizaciones(@Request() req: any) {
    await this.editor(req);
    return this.svc.cotizacionesAdmin();
  }
}
