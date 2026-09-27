import {
  Controller, Get, Post, Put, Patch, Body, Param, UseGuards, Request, Response,
  ForbiddenException, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LogisticaService } from './logistica.service';
import { ParseGuidPipe } from './guid';
import { CotizarDto, ConfirmarCotizacionDto, VerificarPagoDto } from './dto/cotizar.dto';
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

  @Post('cotizaciones')
  confirmar(@Body() dto: ConfirmarCotizacionDto) {
    return this.svc.confirmar(dto);
  }

  @Get('cotizaciones/:token')
  obtener(@Param('token', ParseUUIDPipe) token: string) {
    return this.svc.obtenerPorToken(token);
  }

  @Post('cotizaciones/:token/pago')
  @HttpCode(HttpStatus.OK)
  iniciarPago(@Param('token', ParseUUIDPipe) token: string) {
    return this.svc.iniciarPago(token);
  }

  @Post('cotizaciones/:token/verificar-pago')
  @HttpCode(HttpStatus.OK)
  verificarPago(@Param('token', ParseUUIDPipe) token: string, @Body() dto: VerificarPagoDto) {
    return this.svc.verificarPago(token, dto.transactionId);
  }

  @Get('cotizaciones/:token/pdf')
  async pdf(@Param('token', ParseUUIDPipe) token: string, @Response() res: ExpressResponse) {
    const { buffer, numero } = await this.svc.pdf(token);
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
